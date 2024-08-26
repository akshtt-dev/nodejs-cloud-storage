import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  }
});

const Account = mongoose.model("Accounts", accountSchema);

export default Account;
