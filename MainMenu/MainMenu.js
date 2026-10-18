//This file was created with the aid of AI(Chatgpt)

//Stores admin password
const adminPassword = "Admin123"; 

//Checks if the correct password has been entered
function checkAdmin(event) {
    event.preventDefault();

    //Requests password from user
    const password = prompt("Enter admin password:");

    //Checks to determine correct password
    if (password === adminPassword) {
        // Allow access to the selected page
        window.location.href = event.currentTarget.href;
    } else {
        alert("Incorrect password. Access denied!");
    }
}

// Protect Return Items
document.getElementById("returnItems").addEventListener("click", checkAdmin);

// Protect Create Record
document.getElementById("createRecord").addEventListener("click", checkAdmin);
