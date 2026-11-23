// Convenience guards for each role — used with authenticate() beforehand.
export const requireAdmin = () => authorizeRoles("admin");
export const requireVendor = () => authorizeRoles("vendor");
export const requireCustomer = () => authorizeRoles("customer");

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    // Check authentication
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    console.log("User role:", req.user.role);
    console.log("Allowed roles:", allowedRoles);

    // Check user role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden. You do not have permission.",
      });
    }

    next();
  };
}
