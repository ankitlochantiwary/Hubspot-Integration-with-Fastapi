# Hubspot-Integration-with-Fastapi
 In this project, I built a full HubSpot integration using FastAPI and React. I implemented the OAuth flow, connected it to the frontend, and used my own HubSpot credentials for testing. After authentication, I fetched data from HubSpot APIs and displayed it as integration items, similar to other platforms.


## Things to perform:
 Step 1 : In the terminal, go to the technical_assessment/backend directory and check if redis is working by command -> 'docker ps'
 
Step 2 : Go to new terminal with technical_assessment/backend directory and Connect to backend by command -> 'uvicorn main:app -reload' , check the link if it says {"Ping":"Pong"} then working fine!

Step 3 : Now we have to connect our frontend, in the terminal go to technical_assessment/frontend directory and write command -> 'npm start'
