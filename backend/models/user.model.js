const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    age:{
        type:Number,
        required:true,
        min:1,
    },
    username:{
        type:String,
        required:true,
        unique:true 
    },
    email:{
        type:String,
        required:true,
    },
    password:{
        type:String
    },
    token:{
        type:String
    }
})

const User = mongoose.model("User", userSchema);

module.exports = User;