// script.js

// Listen to form 'submit' event
document.getElementById('visit-form').addEventListener('submit', async function(event) {
    // 1. Prevent default page reload
    event.preventDefault();

    const form = event.target;
    const messageEl = document.getElementById('form-message');

    // 2. Collect form data
    const formData = new FormData(form);
    
    // 3. Build JSON object as the FastAPI expects
    //    IMPORTANT: 'name' attributes become JSON keys
    const data = Object.fromEntries(formData.entries());

    messageEl.textContent = 'Sending...';
    messageEl.style.color = 'deepskyblue';

    try {
        // 4. Send data to the API (backend)
        const response = await fetch('http://127.0.0.1:8000/api/visits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data) // Convert the object to JSON string
        });

        if (response.ok) {
            // 5. Success!
            const result = await response.json();
            console.log('Visita criada:', result);
            messageEl.textContent = `Visit (ID: ${result.id}) successfully scheduled!`;
            messageEl.style.color = 'lightgreen';
            form.reset(); // clear form
        } else {
            // 6. Validation/server error (e.g., invalid date)
            const errorData = await response.json();
            console.error('Erro ao agendar:', errorData);
            messageEl.textContent = 'Error scheduling. Please check the data.';
            messageEl.style.color = 'orangered';
        }

    } catch (error) {
        // 7. Network error (API offline?)
        console.error('Connection error:', error);
        messageEl.textContent = 'Unable to connect to the server.';
        messageEl.style.color = 'orangered';
    }
});