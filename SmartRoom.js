const express = require('express');
const app = express();
const fs = require('fs');
const cors = require('cors');
const https = require('https');
const port = 3030;

let allData = [];
let latestData = {};

app.use(cors());

https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app)
    .listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })


app.get('/', (req, res) => {
    res.send(JSON.stringify(latestData));
});

app.get('/all/', (req, res) => {
    res.send(JSON.stringify(allData));
});

const verify = (req, res, success) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        try{
            body = JSON.parse(body);
        } catch(err) {
            res.sendStatus(415);
            return;
        }
        if(body.key !== '36ebaba344136b2d1f6352624894f111d9e76758') {
            res.sendStatus(401);
            res.end();
            return;
        }
        body.key = '';
        success(body);
    });
};

const ok = (res) => {
    res.write("OK");
    res.end();
};

app.post('/reading/', function (req, res) {
    verify(req, res, (data) => {
        console.log(data);
        latestData = data;
        allData.push(data);
        ok(res);
    });
});

app.post('/delete', (req, res) => {
    verify(req, res, (data) => {
        console.log("Delete all");
        allData = [];
        ok(res);
    });
});
