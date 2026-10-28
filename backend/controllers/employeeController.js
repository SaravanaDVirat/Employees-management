const Employee = require("../models/Employee");
const fs = require("fs");
const path = require("path");

const deletePhoto = (photo) => {
  if (!photo) return;

  const filename = path.basename(photo);
  const photoPath = path.join(__dirname, "..", "uploads", filename);

  fs.unlink(photoPath, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Photo deletion error:", error.message);
    }
  });
};

exports.createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      department,
      designation,
      salary,
      joiningDate,
      employmentStatus
    } = req.body;

    if (
      !employeeId ||
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !department ||
      !designation ||
      salary === undefined ||
      salary === "" ||
      !joiningDate
    ) {
      if (req.file) deletePhoto(req.file.filename);
      return res.status(400).json({
        message: "Please fill all required fields"
      });
    }

    const parsedSalary = Number(salary);

    if (!Number.isFinite(parsedSalary) || parsedSalary < 0) {
      if (req.file) deletePhoto(req.file.filename);
      return res.status(400).json({
        message: "Salary must be a valid non-negative number"
      });
    }

    if (Number.isNaN(Date.parse(joiningDate))) {
      if (req.file) deletePhoto(req.file.filename);
      return res.status(400).json({
        message: "Please provide a valid joining date"
      });
    }

    const existingEmployee = await Employee.findOne({
      $or: [
        { employeeId: employeeId.trim() },
        { email: email.trim().toLowerCase() }
      ]
    });

    if (existingEmployee) {
      if (req.file) deletePhoto(req.file.filename);
      return res.status(409).json({
        message: "Employee ID or email already exists"
      });
    }

    const employee = await Employee.create({
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      department,
      designation,
      salary: parsedSalary,
      joiningDate,
      employmentStatus: employmentStatus || "Active",
      photo: req.file ? req.file.filename : ""
    });

    res.status(201).json({
      message: "Employee created successfully",
      employee
    });
  } catch (error) {
    if (req.file) deletePhoto(req.file.filename);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Employee ID or email already exists"
      });
    }

    res.status(500).json({
      message: "Failed to create employee",
      error: error.message
    });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });

    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch employees",
      error: error.message
    });
  }
};
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    res.status(200).json(employee);
  } catch (error) {
    res.status(400).json({
      message: "Invalid employee ID"
    });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      if (req.file) deletePhoto(req.file.filename);

      return res.status(404).json({
        message: "Employee not found"
      });
    }

    const allowedFields = [
      "employeeId",
      "firstName",
      "lastName",
      "email",
      "phone",
      "department",
      "designation",
      "salary",
      "joiningDate",
      "employmentStatus"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.employeeId !== undefined) {
      updates.employeeId = updates.employeeId.trim();
    }

    if (updates.email !== undefined) {
      updates.email = updates.email.trim().toLowerCase();
    }

    if (updates.salary !== undefined) {
      const parsedSalary = Number(updates.salary);

      if (!Number.isFinite(parsedSalary) || parsedSalary < 0) {
        if (req.file) deletePhoto(req.file.filename);

        return res.status(400).json({
          message: "Salary must be a valid non-negative number"
        });
      }

      updates.salary = parsedSalary;
    }

    if (
      updates.joiningDate !== undefined &&
      Number.isNaN(Date.parse(updates.joiningDate))
    ) {
      if (req.file) deletePhoto(req.file.filename);

      return res.status(400).json({
        message: "Please provide a valid joining date"
      });
    }

    if (
      updates.employmentStatus !== undefined &&
      !["Active", "On Leave", "Resigned"].includes(
        updates.employmentStatus
      )
    ) {
      if (req.file) deletePhoto(req.file.filename);

      return res.status(400).json({
        message: "Invalid employment status"
      });
    }

    const duplicate = await Employee.findOne({
      _id: { $ne: employee._id },
      $or: [
        { employeeId: updates.employeeId || employee.employeeId },
        { email: updates.email || employee.email }
      ]
    });

    if (duplicate) {
      if (req.file) deletePhoto(req.file.filename);

      return res.status(409).json({
        message: "Employee ID or email already exists"
      });
    }

    if (req.file) {
      updates.photo = req.file.filename;
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    );

    if (req.file && employee.photo) {
      deletePhoto(employee.photo);
    }

    res.status(200).json({
      message: "Employee updated successfully",
      employee: updatedEmployee
    });
  } catch (error) {
    if (req.file) deletePhoto(req.file.filename);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Employee ID or email already exists"
      });
    }

    res.status(500).json({
      message: "Failed to update employee",
      error: error.message
    });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found"
      });
    }

    await Employee.findByIdAndDelete(req.params.id);

    if (employee.photo) {
      deletePhoto(employee.photo);
    }

    res.status(200).json({
      message: "Employee deleted successfully"
    });
  } catch (error) {
    res.status(400).json({
      message: "Unable to delete employee",
      error: error.message
    });
  }
};