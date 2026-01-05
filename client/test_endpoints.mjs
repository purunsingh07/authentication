import axios from 'axios';

const BASE_URL = 'https://authentication-hp8z.onrender.com';

async function checkEndpoint(method, path, data = {}) {
    try {
        console.log(`Checking ${method} ${path}...`);
        const response = await axios({
            method,
            url: `${BASE_URL}${path}`,
            data,
            validateStatus: () => true // Resolve promise for all status codes
        });
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, response.data);
    } catch (error) {
        console.error(`Error checking ${path}:`, error.message);
    }
}

async function checkAll() {
    await checkEndpoint('post', '/api/auth/register', { email: 'test@example.com', password: 'password', name: 'test' });
    await checkEndpoint('post', '/api/auth/login', { email: 'test@example.com', password: 'password' });
    await checkEndpoint('get', '/api/auth/is-auth'); // Will likely be 200 {success:false}
    await checkEndpoint('get', '/api/user/data'); // Will likely be 200 {success:false}
}

checkAll();
