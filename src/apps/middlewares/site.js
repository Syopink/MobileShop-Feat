const customerModel = require("../models/customer");

const checkCustomer = async (req, res, next) => {
  if (req.session.email) {
    const customer = await customerModel.findOne({ email: req.session.email });
    res.locals.customer = customer;
  } else {
    res.locals.customer = null;
  }
  next();
};

const checkCustomerAuth = (req, res, next) => {
  if (!req.session.email || !req.session.password) {
    return res.redirect("/login");
  }
  next();
};

module.exports = {
  checkCustomer,
  checkCustomerAuth,
};
