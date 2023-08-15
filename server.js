const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = require('socket.io')(server, {
    handlePreflightRequest: (req, res) => {
        const headers = {
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
            "Access-Control-Allow-Credentials": true
        };
        res.writeHead(200, headers);
        res.end();
    }
});

var sessionstore = require('sessionstore');
var sessionStore = sessionstore.createSessionStore();

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const session = require('express-session');
app.use(session({
    secret: 'secret',
    resave: false,
    store: sessionStore,
    saveUninitialized: false
}));

const mysql = require('mysql');
const db = mysql.createConnection({
    host: "45.81.232.163",
    user: "dbuser",
    password: "XaI50-s3TEaQ",
    database: 'TheChanger',
    port: 3306,
    secure: false
});


const PORT = 3000;

app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});
app.get('/api/getUsers', (req, res) => {
    let query = req.query["q"];
    db.query(`SELECT id, username, LENGTH(username) as length
        FROM users
        WHERE username LIKE '%${query}%'
        ORDER BY
          CASE
            WHEN username LIKE '${query}' THEN 1
            WHEN username LIKE '${query}%' THEN 2
            WHEN username LIKE '%${query}' THEN 4
            ELSE 3
          END,
          length
        LIMIT 20`, (err, rows, result) => {
        if (err) {
            console.log(err);
            res.send("db_err");
            return;
        }
        console.log(rows);
        res.json(rows);
    });
});

server.listen(PORT, () => {
    console.log(`Server listening on PORT ${PORT}`);
})

io.on('connection', socket => {
    console.log("a user connected");
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    
    socket.on("auth:login", data => {
        let username = data.username;
        let password = data.password;
        db.query(`SELECT id FROM users WHERE username = '${username}' AND BINARY password = '${password}'`, (err, rows, result) => {
            if (err) {
                console.log(err);
                socket.emit("auth:login:return", {"message": "Ein Datenbankfehler ist aufgetreten."});
                return;
            }
            if (rows.length === 1) {
                socket.emit("auth:login:success");
                // Setzen Sie die Session-Variablen
                console.log(socket.handshake);
                socket.handshake.session.loggedIn = true;
                socket.handshake.session.userId = rows[0].id;
                socket.handshake.session.save();
            } else {
                socket.emit("auth:login:return", {"message": "Password oder Benutzername falsch. 😭 ... Geh Scheißn!"});
            }
        });
    });
    
    socket.on("auth:register", data => {
        let username = data.username;
        let password = data.password;
        // Prüfen, ob der Benutzername bereits verwendet wird
        db.query(`SELECT * FROM users WHERE username = '${username}'`, (err, rows, result) => {
            if (err) {
                console.log(err);
                socket.emit("auth:register:return", {"message": "Ein Datenbankfehler ist aufgetreten."});
                return;
            }
            if (rows.length > 0) {
                socket.emit("auth:register:return", {"message": "Der Benutzername ist bereits verwendet."});
                return;
            }

            // Prüfen, ob das Passwort den Anforderungen entspricht
            if (password.length < 8) {
                socket.emit("auth:register:return", {"message": "Das Passwort muss mindestens 8 Zeichen lang sein."});
                return;
            }

            // Speichern des Benutzernamens und Passworts in der Datenbank
            db.query(`INSERT INTO users (username,password) VALUES ('${username}', '${password}')`, (err, rows, result) => {
                if (err) {
                    console.log(err);
                    socket.emit("auth:register:return", {"message": "Ein Datenbankfehler ist aufgetreten."});
                    return;
                }
                socket.emit("auth:register:success");
            });
        });
    });



    if (!socket.handshake.session) {
        console.log("NO");
        return;
    }

    if (!socket.handshake.session.loggedIn) {
        // Kein angemeldeter Benutzer
        return;
    }

    let userId = socket.handshake.session.userId;

    socket.on("send_message", function(data) {
        socket.broadcast.emit("new_message", {"message": userId + data.message});
    });
      

})