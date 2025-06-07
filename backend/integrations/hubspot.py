from fastapi import Request, HTTPException
from fastapi.responses import HTMLResponse
import secrets
import json
import base64
import asyncio
import httpx
import requests
from integrations.contact_integration_item import ContactIntegrationItem
from redis_client import add_key_value_redis, get_value_redis, delete_key_redis

# HubSpot OAuth Credentials
CLIENT_ID = '34326b8b-8359-4415-a866-0a8b85ee98d2'
CLIENT_SECRET = 'a123e285-5b85-4e71-8ce6-40d828ce64db'

# Permissions Scope
SCOPE = 'oauth crm.objects.contacts.read crm.objects.companies.read'

AUTHORIZATION_URI = 'https://app.hubspot.com/oauth/authorize'
REDIRECT_URI = 'http://localhost:8000/integrations/hubspot/oauth2callback'


async def authorize_hubspot(user_id, org_id):
    """Generate authorization URL for HubSpot OAuth"""
    state_data = {
        'state': secrets.token_urlsafe(32),
        'user_id': user_id,
        'org_id': org_id,
    }
    encoded_state = base64.urlsafe_b64encode(json.dumps(state_data).encode('utf-8')).decode('utf-8')
    auth_url = f'{AUTHORIZATION_URI}?client_id={CLIENT_ID}&scope={SCOPE}&redirect_uri={REDIRECT_URI}&state={encoded_state}'

    await add_key_value_redis(f'hubspot_state:{org_id}:{user_id}', json.dumps(state_data), expire=600)
    return auth_url


async def oauth2callback_hubspot(request: Request):
    """Handle OAuth callback and store access token in Redis"""
    print(f"OAuth callback triggered with params: {request.query_params}")

    if request.query_params.get('error'):
        raise HTTPException(status_code=400, detail=request.query_params.get('error_description'))

    code = request.query_params.get('code')
    encoded_state = request.query_params.get('state')
    print(f"Received code: {code}")

    state_data = json.loads(base64.urlsafe_b64decode(encoded_state).decode('utf-8'))
    user_id = state_data.get('user_id')
    org_id = state_data.get('org_id')
    print(f"Decoded state: {state_data}")

    # Validate state from Redis
    saved_state = await get_value_redis(f'hubspot_state:{org_id}:{user_id}')
    if not saved_state:
        print(f"Error: State not found in Redis for {org_id}:{user_id}")
        raise HTTPException(status_code=400, detail="State mismatch or expired.")

    stored_state_data = json.loads(saved_state)
    if stored_state_data.get("state") != state_data.get("state"):
        print("Error: State values do not match.")
        raise HTTPException(status_code=400, detail="State mismatch detected.")

    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            'https://api.hubapi.com/oauth/v1/token',
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': REDIRECT_URI,
                'client_id': CLIENT_ID,
                'client_secret': CLIENT_SECRET
            },
        )

    if response.status_code != 200:
        print(f"Token request failed: {response.text}")
        raise HTTPException(status_code=response.status_code, detail="Failed to retrieve tokens.")

    credentials = response.json()
    print(f"Received OAuth tokens: {credentials}")

    await add_key_value_redis(f'hubspot_credentials:{org_id}:{user_id}', json.dumps(credentials), expire=600)
    await delete_key_redis(f'hubspot_state:{org_id}:{user_id}')

    print("Saved credentials to Redis successfully!")
    return HTMLResponse(content="<script>window.close();</script>")


async def get_hubspot_credentials(user_id, org_id):
    """Retrieve stored credentials from Redis"""
    credentials = await get_value_redis(f'hubspot_credentials:{org_id}:{user_id}')
    if not credentials:
        raise HTTPException(status_code=400, detail='No credentials found.')

    credentials = json.loads(credentials)
    await delete_key_redis(f'hubspot_credentials:{org_id}:{user_id}')

    return credentials


def create_integration_item_metadata_object(response_json) -> ContactIntegrationItem:
    """Create metadata object for contacts and companies"""
    return ContactIntegrationItem(
        id=response_json.get("id"),
        createdAt=response_json.get("createdAt"),
        updatedAt=response_json.get("updatedAt"),
        firstName=response_json.get("properties", {}).get("firstname"),
        lastName=response_json.get("properties", {}).get("lastname"),
        email=response_json.get("properties", {}).get("email"),
        archived=response_json.get("archived"),
    )


def fetch_items(access_token: str, url: str, aggregated_response: list):
    """Fetches contacts or companies from HubSpot API"""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        results = response.json().get("results", [])
        aggregated_response.extend(results)
    else:
        print(f"Error fetching items from {url}: {response.status_code}, {response.text}")


async def get_items_hubspot(credentials):
    """Fetch both contacts and companies from HubSpot and return structured metadata"""
    credentials = json.loads(credentials)
    access_token = credentials.get("access_token")

    urls = {
        "contacts": "https://api.hubapi.com/crm/v3/objects/contacts",
        "companies": "https://api.hubapi.com/crm/v3/objects/companies",
    }

    all_data = {"contacts": [], "companies": []}

    for key, url in urls.items():
        list_of_responses = []
        fetch_items(access_token, url, list_of_responses)

        all_data[key] = [create_integration_item_metadata_object(response) for response in list_of_responses]

    # Print structured JSON output
    print("Stored HubSpot Data:")
    print(json.dumps(
        {
            "contacts": [item.__dict__ for item in all_data["contacts"]],
            "companies": [item.__dict__ for item in all_data["companies"]],
        },
        indent=4,
    ))

    return all_data
