// Assumes that the db file is empty (no tables exist)
module.exports = function(db) {
    db.serialize(function() {
        db.run(`create table websites (domain text NOT NULL, bias decimal(10,8), reliability decimal(10, 8), PRIMARY KEY (domain))`, err => {
            if (err != null) {
                console.error(err)
            }
        })
    })
}
