require('dotenv').config();
const fs = require('fs');
const cors = require('cors');
const https = require('https');
const url = require('url');
const port = 3030;
const portHttp = 3031;
const mysql = require('mysql');
const http = require('http');
const express = require('express');

const app = express();

const SENSOR_TYPES = ['temperature', 'humidity'];

let latestData = {};
let lastInsert = {};
let status = {
    heater: false,
    color: {
        r: 0,
        g: 0,
        b: 0,
    },
    buzzer: [],
};


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

const connection = mysql.createConnection({
    host: process.env.MYSQL_URL,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    database: 'SmartRoom'
});

connection.connect(function (err) {
    if (err) {
        console.error('error connecting MYSQL: ' + err.stack);
        process.exit(1);
    }

    console.log('connected as id ' + connection.threadId);
});

app.use(cors());

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
    const queryObject = url.parse(req.url, true).query;
    if (queryObject.key !== process.env.LOGIN_KEY) {
        res.sendStatus(401);
        res.end();
        return;
    }
    delete queryObject.key;
    success(queryObject);
};

const handleReading = (data) => {
    const temp = data.temperature;
    let insert = '';
    if (!isNaN(temp) && (!lastInsert.temperature || Math.abs(temp - lastInsert.temperature) >= 0.5)) {
        insert += `('temperature', ` + temp + `)`;
        lastInsert.temperature = temp;
    }

    const humid = data.humidity;
    if (!isNaN(humid) && (!lastInsert.humidity || Math.abs(humid - lastInsert.humidity) >= 2)) {
        insert += (!!insert ? ',' : '') + `('humidity', ` + humid + `)`;
        lastInsert.humidity = humid;
    }

    if (insert) {
        insert = 'INSERT INTO reading (type, value) VALUES ' + insert;
        connection.query(insert, function (error, results, fields) {
            if (error) throw error;
        });
    }

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
app.get('/', (req, res) => {
    res.send(JSON.stringify(latestData));
});

app.post('/reading/', function (req, res) {
    verify(req, res, (data) => {
        latestData = {
            ...latestData,
            ...data
        };
        handleReading(data);
        ok(res);
    });
});
const handleList = function(req, res) {
    const type = req.params.type;
    const from = Date.now() - (req.params.fromMsInPast);
    const to = Date.now() - (req.params.toMsInPast | 0);
    const steps = 30;
    if(!SENSOR_TYPES.includes(type)) {
        res.sendStatus(415);
        return;
    }

    const graphData = new Array(steps);
    let index = 0;
    let doneCalls = 0;
    const doneCallback = () => {
        res.json(graphData);
    };
    for(let timeStamp = from; timeStamp <= to; timeStamp += (to-from)/(steps-1)) {
        ((index) => {
            connection.query("SELECT id, time, value " +
                "FROM `reading` WHERE `type` = '"+type+"' " +
                "and time <= FROM_UNIXTIME("+timeStamp+"*0.001) " +
                "order by time desc LIMIT 1",
                function (error, results, fields) {
                    let value = null;
                    if(results.length === 1)
                        value = results[0].value;
                    graphData[index] = {
                        millis: timeStamp,
                        value: value
                    };
                    doneCalls++;
                    if(doneCalls === steps) {
                        doneCallback();
                    }
                });
        })(index);

        index++;
    }
};

app.get('/get/list/:type/:fromMsInPast/:toMsInPast', handleList);
app.get('/get/list/:type/:fromMsInPast', handleList);

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
