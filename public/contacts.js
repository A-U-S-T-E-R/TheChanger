function addFriends(users) {
    $("#friends_popup_friends").empty();
    for (let i = 0; i < users.length; i++) {
        $("#friends_popup_friends").append(`<li onclick="addFriend(` + users[i].id + `);">` + users[i].username + `</li>`);
    }
}

function searchUsers(query) {
    fetch('/api/getUsers?q=' + query)
        .then(response => response.json())
        .then(data => {
            addFriends(data);
        })
        .catch(err => {
            alert(err);
        })
}

function addFriend(id) {
    console.log("Füge Freund mit der ID " + id + " hinzu.");
}