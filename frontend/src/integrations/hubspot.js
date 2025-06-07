import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress
} from '@mui/material';
import axios from 'axios';

export const HubSpotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // To connect hubspot with authO, a request is sent to backend. In response we get a URL for hubspot authorization.
    const handleConnectClick = async () => {
        try {
            setIsConnecting(true);
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);
            const response = await axios.post(`http://localhost:8000/integrations/hubspot/authorize`, formData);
            const authURL = response?.data;
            const newWindow = window.open(authURL, 'HubSpot Authorization', 'width=600, height=600');
            const pollTimer = window.setInterval(() => {
                if (newWindow?.closed !== false) {
                    window.clearInterval(pollTimer);
                    handleWindowClosed();
                }
            }, 200)
        } catch (e) {
            setIsConnecting(false);
            alert(e?.response?.data?.detail);
        }
    }

    // When the hubspot is authorized, we fetch credentials from the backend.
    const handleWindowClosed = async () => {
        try {
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);
            const response = await axios.post(`http://localhost:8000/integrations/hubspot/credentials`, formData);
            const credentials = response.data;
            if (credentials) {
                setIsConnecting(false);
                setIsConnected(true);
                setIntegrationParams(prev => ({ ...prev, credentials: credentials, type: 'HubSpot' }));
            }
            setIsConnecting(false);
        } catch (e) {
            setIsConnecting(false);
            alert(e?.response?.data?.detail);
        }
    }

    useEffect(() => {
        setIsConnected(integrationParams?.credentials ? true : false)
    }, [])

    return (
        <>
            {/* Code to display the connection buttons */}
            <Box sx={{ mt: 2 }}>
                Parameters
                <Box display='flex' alignItems='center' justifyContent='center' sx={{ mt: 2 }}>
                    <Button
                        variant='contained'
                        onClick={isConnected ? () => { } : handleConnectClick}
                        color={isConnected ? 'success' : 'primary'}
                        disabled={isConnecting}
                        style={{
                            pointerEvents: isConnected ? 'none' : 'auto',
                            cursor: isConnected ? 'default' : 'pointer',
                            opacity: isConnected ? 1 : undefined
                        }}
                    >
                        {isConnected ? 'HubSpot Connected' : isConnecting ? <CircularProgress size={20} /> : 'Connect to HubSpot'}
                    </Button>
                </Box>
            </Box>
        </>
    )
}








// import { useState, useEffect } from 'react';
// import {
//     Box,
//     Button,
//     CircularProgress,
//     TextField,
//     Typography
// } from '@mui/material';
// import axios from 'axios';

// export const HubSpotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
//     const [isConnected, setIsConnected] = useState(false);
//     const [isConnecting, setIsConnecting] = useState(false);
//     const [contacts, setContacts] = useState([]);
//     const [companies, setCompanies] = useState([]);
//     const [loadedData, setLoadedData] = useState(null);

//     // Function to connect HubSpot via OAuth
//     const handleConnectClick = async () => {
//         try {
//             setIsConnecting(true);
//             const formData = new FormData();
//             formData.append('user_id', user);
//             formData.append('org_id', org);
//             const response = await axios.post(`http://localhost:8000/integrations/hubspot/authorize`, formData);
//             const authURL = response?.data;
//             const newWindow = window.open(authURL, 'HubSpot Authorization', 'width=600, height=600');
//             const pollTimer = window.setInterval(() => {
//                 if (newWindow?.closed !== false) {
//                     window.clearInterval(pollTimer);
//                     handleWindowClosed();
//                 }
//             }, 200);
//         } catch (e) {
//             setIsConnecting(false);
//             alert(e?.response?.data?.detail);
//         }
//     };

//     // Function to check authentication status and fetch credentials
//     const handleWindowClosed = async () => {
//         try {
//             const formData = new FormData();
//             formData.append('user_id', user);
//             formData.append('org_id', org);
//             const response = await axios.post(`http://localhost:8000/integrations/hubspot/credentials`, formData);
//             const credentials = response.data;
//             if (credentials) {
//                 setIsConnecting(false);
//                 setIsConnected(true);
//                 setIntegrationParams(prev => ({ ...prev, credentials: credentials, type: 'HubSpot' }));
//             }
//             setIsConnecting(false);
//         } catch (e) {
//             setIsConnecting(false);
//             alert(e?.response?.data?.detail);
//         }
//     };

//     const fetchHubSpotData = async () => {
//         try {
//             const formData = new FormData();
//             formData.append('user_id', user);
//             formData.append('org_id', org);
//             const response = await axios.post(`http://localhost:8000/integrations/hubspot/load`, formData);
//             const data = response.data;
            
//             setContacts(data.contacts || []);
//             setCompanies(data.companies || []);
//             setLoadedData(data);
//         } catch (e) {
//             console.error("Fetch Error:", e);
//             alert("Failed to fetch data: " + (e.response?.data?.detail || JSON.stringify(e.response?.data) || e.message));
//         }
//     };
    

//     // Function to clear displayed data
//     const clearData = () => {
//         setContacts([]);
//         setCompanies([]);
//         setLoadedData(null);
//     };

//     useEffect(() => {
//         setIsConnected(integrationParams?.credentials ? true : false);
//     }, [integrationParams]);

//     return (
//         <Box sx={{ mt: 2 }}>
//             <Typography variant="h6">HubSpot Integration</Typography>

//             {/* Connection Button */}
//             <Box display='flex' alignItems='center' justifyContent='center' sx={{ mt: 2 }}>
//                 <Button
//                     variant='contained'
//                     onClick={isConnected ? () => {} : handleConnectClick}
//                     color={isConnected ? 'success' : 'primary'}
//                     disabled={isConnecting}
//                     style={{
//                         pointerEvents: isConnected ? 'none' : 'auto',
//                         cursor: isConnected ? 'default' : 'pointer',
//                         opacity: isConnected ? 1 : undefined
//                     }}
//                 >
//                     {isConnected ? 'HubSpot Connected' : isConnecting ? <CircularProgress size={20} /> : 'Connect to HubSpot'}
//                 </Button>
//             </Box>

//             {/* Display Contacts */}
//             <Typography variant="h6" sx={{ mt: 3 }}>Contacts</Typography>
//             {contacts.length > 0 ? (
//                 contacts.map((contact, index) => (
//                     <Typography key={index}>
//                         {contact.name} - {contact.email}
//                     </Typography>
//                 ))
//             ) : (
//                 <Typography>No contacts found.</Typography>
//             )}

//             {/* Display Companies */}
//             <Typography variant="h6" sx={{ mt: 3 }}>Companies</Typography>
//             {companies.length > 0 ? (
//                 companies.map((company, index) => (
//                     <Typography key={index}>
//                         {company.id} - {company.name}
//                     </Typography>
//                 ))
//             ) : (
//                 <Typography>No companies found.</Typography>
//             )}

//             {/* Loaded Data Display */}
//             <Typography variant="h6" sx={{ mt: 3 }}>Loaded Data</Typography>
//             <TextField
//                 variant="outlined"
//                 fullWidth
//                 disabled
//                 value={loadedData ? JSON.stringify(loadedData) : ''}
//             />

//             {/* Load / Clear Data Buttons */}
//             <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
//                 <Button variant="contained" color="primary" onClick={fetchHubSpotData}>
//                     Load Data
//                 </Button>
//                 <Button variant="contained" color="secondary" onClick={clearData}>
//                     Clear Data
//                 </Button>
//             </Box>
//         </Box>
//     );
// };
