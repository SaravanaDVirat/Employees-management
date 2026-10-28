const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const connectDB = require("./config/db");
const employeeRoutes = require("./routes/employeeRoutes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Employee Management API is running");
});

app.use("/api/employees", employeeRoutes);

app.use((error, req, res, next) => {
  if (error instanceof require("multer").MulterError) {
    return res.status(400).json({
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Photo size must be 2 MB or less"
        : error.message
    });
  }

  if (error.message === "Only JPG, PNG and WEBP images are allowed") {
    return res.status(400).json({
      message: error.message
    });
  }

  console.error(error);

  res.status(500).json({
    message: "Internal server error"
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});