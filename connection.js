require('dotenv').config();
const { MongoClient } = require('mongodb');
const URI = 'mongodb+srv://gus_13:Mongoose13@cluster0.5jghw.mongodb.net/<dbname>?retryWrites=true&w=majority';

async function main(callback) {
    const client = new MongoClient(URI, { useNewUrlParser: true, useUnifiedTopology: true });
    try {
        await client.connect();
        await callback(client);
    } catch (e) {
        console.error(e);
        throw new Error('Unable to Connect to Database')
    }
}

module.exports = main;