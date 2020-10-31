require('dotenv').config();

const express = require('express');
const api= require("./api.js");

const http = require('http');
const frontendPort = 3080;

frontEnd = express();
http.createServer(frontEnd)
    .listen(frontendPort, () => {
        console.log(`Frontend listening at http://localhost:${frontendPort}`)
    });
frontEnd.use(express.static(process.env.FRONTEND_PATH));
frontEnd.use(function (req, res, next) {
    res.sendFile(process.env.FRONTEND_INDEX_FILE);
});





