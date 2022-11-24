require('dotenv').config()
const express = require('express');
const app = express();
const BoxSDK = require('box-node-sdk');
const axios = require('axios');
const { BoxFolderTreeBuilder } = require('./TreeBuilder')


const PORT = process.env.PORT || 5000;


app.set('view engine', 'ejs')

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

let sdk = new BoxSDK({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET
});


let client
let access_token = ""

// To get a code
app.get('/', (req, res) => {

    // the URL to redirect the user to
    const authorize_url = sdk.getAuthorizeURL({
        response_type: 'code'
    });

    res.redirect(authorize_url)
})


// Callback url
app.get('/callback', (req, res) => {
    console.log("route : /callback");
    const code = req.query.code;

    const data = JSON.stringify({
        'client_id': process.env.CLIENT_ID,
        'client_secret': process.env.CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code'
    })

    const config = {
        method: 'post',
        url: 'https://api.box.com/oauth2/token',
        headers: {
            'Content-Type': 'application/json'
        },
        data: data
    };

    axios(config)
        .then(function (response) {
            access_token = response.data.access_token
            client = BoxSDK.getBasicClient(access_token);
            res.redirect('/landing')
        })
        .catch(function (error) {
            console.log(error);
            res.status(200).end("user authorize failed")
        });

})


// Landing page
app.get('/landing', (req, res) => {
    res.status(200).render('index')
})


// Get all folders from root
app.get('/listFolders', async (req, res) => {

    let folderTreeBuilder = new BoxFolderTreeBuilder(client);
    const tree = await folderTreeBuilder.buildFolderTreeWithFlatLists()
    // res.json(tree)
    res.status(200).render('folders',{ tree : tree , access_token})
})



app.listen(PORT, () => {
    console.log(`listening at PORT : ${PORT}`)
})













