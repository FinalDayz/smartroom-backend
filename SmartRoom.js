require('dotenv').config();

const express = require('express');
const app = express();
const fs = require('fs');
const cors = require('cors');
const https = require('https');
const http = require('http');
const url = require('url');
const port = 3030;
const portHttp = 3031;
const frontendPort = 3080;

let allData = [];
let latestData = {};
let status = {
    heater: false,
    color: {
        r: 0,
        g: 0,
        b: 0,
    },
    buzzer: [],
};

frontEnd = express();
http.createServer(frontEnd)
    .listen(frontendPort, () => {
        console.log(`Frontend listening at http://localhost:${frontendPort}`)
    });
frontEnd.use(express.static(process.env.FRONTEND_PATH));
frontEnd.use(function (req, res, next) {
    res.sendFile(process.env.FRONTEND_INDEX_FILE);
});

app.use(cors());

https.createServer({
    key: fs.readFileSync('ssl/server.key'),
    cert: fs.readFileSync('ssl/server.cert')
}, app)
    .listen(port, () => {
        console.log(`HTTPS app listening at https://localhost:${port}`)
    });

http.createServer(app)
    .listen(portHttp, () => {
        console.log(`Http app listening at http://localhost:${portHttp}`)
    });



app.get('/', (req, res) => {
    res.send(JSON.stringify(latestData));
});
//
// app.get('/all/', (req, res) => {
//     res.send(JSON.stringify(allData));
// });

const verify = (req, res, success) => {
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        try {
            body = JSON.parse(body);
        } catch (err) {
            res.sendStatus(415);
            return;
        }
        if (body.key !== process.env.LOGIN_KEY) {
            res.sendStatus(401);
            res.end();
            return;
        }
        delete body.key;
        success(body);
    });
};

const verifyGet = (req, res, success) => {
    const queryObject = url.parse(req.url,true).query;
    if (queryObject.key !== process.env.LOGIN_KEY) {
        res.sendStatus(401);
        res.end();
        return;
    }
    delete queryObject.key;
    success(queryObject);
};

const ok = (res) => {
    res.write(JSON.stringify(status));
    res.end();
};

app.get("/status", function (req, res) {
    verifyGet(req, res, params => {
        ok(res);
    });
});

app.post('/reading/', function (req, res) {
    verify(req, res, (data) => {
        latestData = {
            ...latestData,
            ...data
        };
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


app.post('/set/heater', function (req, res) {
    verify(req, res, (data) => {
        status.heater = data.heater;
        ok(res);
    });
});
app.post('/set/color', function (req, res) {
    verify(req, res, (data) => {
        status.color = data.color;
        ok(res);
    });
});
app.post('/set/buzzer', function (req, res) {
    verify(req, res, (data) => {
        status.buzzer = data.buzzer;
        ok(res);
    });
});

