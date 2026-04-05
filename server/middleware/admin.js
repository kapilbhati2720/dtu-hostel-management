module.exports = function (req, res, next) {
  // req.user.roles is an array like: [{ role_name: 'super_admin', ... }]
  // We check if any object in this array has the role_name we need.
  if (req.user && req.user.roles.some(r => r.role_name === 'super_admin')) {
    next();
  } else {
    return res.status(403).json({ msg: 'Access denied. Admin resource.' });
  }
};