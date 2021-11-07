const express = require('express')
const cors = require('cors')

const sqlite3 = require('sqlite3').verbose() // todo:: remove verbose
const fs = require('fs')
const database_name = "testdb"

var bodyParser = require('body-parser')
// create application/x-www-form-urlencoded parser
// this is needed to read HTML form data for the /api/feedback route
var urlencodedParser = bodyParser.urlencoded({ extended: false })

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

const empty_entry = {
    "bias": 0.0,
    "reliability": 0.0
}

app.get('/api/lookup', cors(), function (req, res) {
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
            res.setHeader("Content-Type", "application/json")
            res.json(row);
        } else {
            console.debug("Could not find row for domain", req.query.domain);
            // We don't actually want to create this row. This domain
            // might not make sense to have an entry.
            // on_domain_lookup_fail(req.query.domain)
            res.setHeader("Content-Type", "application/json")
            res.json(empty_entry);
        }
    })
})

var update_rating = function(domain, bias, reliability) {
    var statement = db.prepare(`update websites set bias=(?), reliability=(?) where domain=(?)`);
    statement.run(bias, reliability, domain, err=>{
        if (err != null) { console.error("Failed to update", domain, err); }
        else { console.debug(`Set ${domain} bias=${bias} reliability=${reliability}`)}
    })
}

const feedback_weight = 0.1

app.post('/api/feedback', cors(), urlencodedParser, function (req, res) {
    if (!req.body.domain || !req.body.bias || !req.body.reliability) {
        console.warn("Bad /api/feedback request (missing queries)")
        res.status(400).end()
        return;
    }
    // We first need to get the old values so that we can do the math and update.
    var statement = db.prepare(`select bias, reliability from websites where domain=(?)`)
    statement.get(req.body.domain, function (err, row) {
        if (err != null) {
            console.error("failed lookup for /api/feedback", err)
            res.status(500).end()
            return
        }
        if (row) {
            // console.debug("Found row for domain", req.query.domain, row);
            // res.json(row);
            update_rating(
                req.body.domain, 
                row["bias"] * (1-feedback_weight) + req.body.bias * feedback_weight, 
                row["reliability"] * (1-feedback_weight) + req.body.reliability * feedback_weight
                );
        } else {
            console.debug("Could not find row for domain in /api/feedback", req.body.domain);
            on_domain_lookup_fail(req.body.domain)
            update_rating(req.body.domain, req.body.bias, req.body.reliability)
        }
        // Send them back to the previous page
        res.redirect(req.header('Referer') || '/');
    })
})

// Let's serve that static directory to make
// testing files :)
// todo:: make this serve a nice webpage as well
app.use(express.static('static'))

app.listen(port, () => {
    console.log(`Started listening on :${port}`)
})
