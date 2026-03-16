// const mongoose = require("mongoose")



// const connectDb = async () => {

//     try {
//         const connectionString = process.env.MONGO_URI
//         // these process are happening on workers threads lefting the main thread vacant and not blocking i/o
//         await mongoose.connect(connectionString)   // libuv will transefer this task to microtask quene
//         console.log("Db Connected ")  // this process was waiting for above await  
//     } catch (error) {
//         console.log(error)
//     }
// }



// module.exports = connectDb


/*const mongoose = require("mongoose")



const connectDb = async () => {

    try {
        const connectionString = "mongodb://localhost:27017/Lumiro"
        await mongoose.connect(connectionString)  
        console.log("Db Connected ")   
    } catch (error) {
        console.log(error)
    }
} */


const mongoose = require("mongoose");

const connectDb = async () => {
  try {

    // Get MongoDB connection string from environment variables
    const connectionString = process.env.MONGO_URI;

    // Connect to MongoDB Atlas
    await mongoose.connect(connectionString);

    console.log("Db Connected");

  } catch (error) {

    console.error("Database connection error:", error);

  }
};


module.exports = connectDb
