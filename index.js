'use strict';

const snmp = require ("net-snmp");
const fs = require('fs');

// Parse arguments, this may be improved using more human friendly arg parser w/ helper, handle args errors, etc
const ips = process.argv.slice(2);

// OID map, this may be improved using MIBs instead.
// They contains detailed information about the OID including data types etc
const oids = {
    "1.3.6.1.2.1.1.5.0":"sysName",
    "1.3.6.1.2.1.1.1.0":"sysDescription",
    "1.3.6.1.2.1.1.6.0":"sysLocation"
}

// Size of the ip chunk to batch
const chunk_size = 5;

// Split ip array into chunks
let ips_chunks = [];
let i,j,chunk = chunk_size;
for (i = 0,j = ips.length; i < j; i += chunk) {
    ips_chunks.push(ips.slice(i, i + chunk))
}


// SNMP Options

const snmpOptions = {
    retries: 1,
    timeout: 3000, // in milliseconds
    backoff: 1.0, // backoff factor between retries, 1 for no increase
    version: snmp.Version2c
};

// Functions

function getSnmp(ip,community) {
    return new Promise((resolve,reject)=>{
        let session = snmp.createSession (ip, community, snmpOptions);
        session.get (Object.keys(oids), (error, varbinds) => {
            if (error) {
                return resolve({[ip]: {error:error.message}});
            }
            // To improve: Library documentation encourage handling error per varbind, not done here
            // Converts all values to string (Convert array into an object)
            const result = varbinds.reduce((acc,varbind)=>({
                ...acc,
                [oids[varbind.oid]]: varbind.value.toString(),
            }),{})
            session.close();
            resolve({[ip]: result});
        });
    })
}

// Main

// Read credentials from file
let credentials = {};
fs.readFile('credentials.json', (err, data) => {
    if (err) throw err;
    credentials = JSON.parse(data);

    // Generate an array of promises for each chunk, in a serial fashion one chunk at time
    // Prints a JSON object per ip in STDOUT, if fails it includes an error property w/ error message
    
    ips_chunks.reduce((promise, chunk) => 
        promise.then(() =>
            Promise.all(
                chunk.map(
                    ip => getSnmp(ip, credentials.community)
                        .then(r => console.log(r))
                )
            )

        ), Promise.resolve());
});


//lbritos@f0189841344b ejercicio-ig % node index.js 192.168.88.1 192.168.88.2
//{
//'192.168.88.1': {
//    sysName: 'MikroTik',
//    sysDescription: 'RouterOS RB750Gr3',
//    sysLocation: 'casa'
//  }
//}
//{ '192.168.88.2': { error: 'Request timed out' } }






