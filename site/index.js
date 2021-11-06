const express = require('express')

const sqlite3 = require('sqlite3').verbose() // todo:: remove verbose
const fs = require('fs')
const database_name = "testdb"

var exists = fs.existsSync(database_name)
const db = new sqlite3.Database(database_name)

// If the file doesn't exist before we open it,
// we also need to run the createdb function on it
if (!exists) {
    console.debug("Creating database")
    let createdb = require('./createdb')
    createdb(db)
}

const app = express();
const port = 8000

count = 0;

var on_domain_lookup_fail = function (domain) {
    // We want to insert this domain into the database
    var statement = db.prepare(`insert into websites(domain, bias, reliability) values ((?), 0.0, 0.0)`);
    statement.run(domain, err => {
        if (err != null) { console.error(err); }
    });
}

app.get('/', function (req, res) {
    res.status(200).send(`Hello! Count: ${count}`);
    count++;
})

const empty_entry = {
    "bias": 0.0,
    "reliability": 0.0
}

app.get('/api/lookup', function (req, res) {
    if (!req.query.domain) {
        console.warn("Bad /api/lookup request (no domain query)")
        res.status(400).end()
        return;
    }

    console.debug(`Responding to a /api/lookup with domain "${req.query.domain}"`)
    var statement = db.prepare(`select bias, reliability from websites where domain=(?)`)
    statement.get(req.query.domain, function (err, row) {
        if (err != null) {
            console.error("failed /api/lookup", err)
            res.status(500).end()
            return
        }
        if (row) {
            console.debug("Found row for domain", req.query.domain, row);
            res.json(row);
        } else {
            console.debug("Could not find row for domain", req.query.domain);
            on_domain_lookup_fail(req.query.domain)
            res.json(empty_entry);
        }
    })
})

app.listen(port, () => {
    console.log(`Started listening on :${port}`)
})
