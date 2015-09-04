var express = require('express');
var session = require('express-session')
var https = require('https');
var parseString = require('xml2js').parseString;

var os = require("os");
var hostname = os.hostname();
console.log("Current Hostname: %s",hostname);

var ips = [];
var nics = os.networkInterfaces();
Object.keys(nics).forEach(function (nicId){
  var nic = nics[nicId]
  nics[nicId].forEach(function (address){
    if(!address['internal'] && address['family']=='IPv4' && address['mac'] != '00:00:00:00:00:00'){
      ips.push(address['address']);
    }
  });
});

console.log("Current IPs: %s",ips);

if ( typeof String.prototype.endsWith != 'function' ) {
  String.prototype.endsWith = function( str ) {
    return this.substring( this.length - str.length, this.length ) === str;
  }
};

var dns = require("dns");
ips.forEach(function (ip){
  dns.reverse(ip, function (err, ipNames){
    console.log("Found additional hostnames %s",ipNames);
    ipNames.forEach(function(ipName){
      if(ipName.endsWith('gatech.edu')){
        hostname = ipNames[0];
      }
    });
  });
})

var app = express();

app.set('trust proxy', 1) // trust first proxy

app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: "cree craw toad's foot geese walk barefoot"
}))

var sess;
app.get('/*', function (req, res) {
  if(req.hostname != hostname){
    var hostnameWithPort = req.get('host').replace(req.hostname,hostname);
    var fullUrl = req.protocol + '://' + hostnameWithPort + req.originalUrl;
    res.redirect(302,fullUrl);
    return;
  }

  console.log();

  var baseURL = req.protocol + '://' + req.get('host');//should fix this to work with req.url but have to trim off ticket info to work
  sess=req.session;

  console.log(baseURL);

/*
* Here we have assign the 'session' to 'sess'.
* Now we can create any number of session variable we want.
* in PHP we do as $_SESSION['var name'].
* Here we do like this.
*/
if(sess.username !== undefined){
    //Already logged in before
    res.send('Hello '+sess.username+'!');
  }else if(req.query.ticket !== undefined){
    //Check to see if this is a login request
    var serviceValidate = 'https://login.gatech.edu/cas/serviceValidate?service='+encodeURIComponent(baseURL)+'&ticket='+encodeURIComponent(req.query.ticket);
    console.log(serviceValidate);

    https.get(serviceValidate, function(validateResponse){
      var body = '';
      validateResponse.on('data', function(chunk) {
        body += chunk;
      });
      validateResponse.on('end', function(){
        //handling the response
        parseString(body, function (err, result) {
          if(result !== undefined && result['cas:serviceResponse'] !== undefined){
            if(result['cas:serviceResponse']['cas:authenticationSuccess'] !== undefined){
              var sucessResult = result['cas:serviceResponse']['cas:authenticationSuccess'];
              sess.username = sucessResult[0]['cas:user'][0];

            //redirect back to where we started
            res.redirect(sess.requestedURL);
            delete sess.requestedURL;
          }else{
              //Login Failed Try Again: May cause infinite browser redirect loop
              res.redirect(302,'https://login.gatech.edu/cas/login?service='+encodeURIComponent(baseURL));
            }
            console.dir(JSON.stringify(result));
          }else{
            res.send('Unable To Process CAS Response')
          }
        });
      });
    }).on('error', function(e) {
      res.send('HTTP Validation error');
    });
  }else{
    sess.requestedURL = req.url;
    //This is unlogged in user redirect them
    res.redirect(302,'https://login.gatech.edu/cas/login?service='+encodeURIComponent(baseURL));
  }
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});