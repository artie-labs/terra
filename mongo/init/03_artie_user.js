const admin = db.getSiblingDB("admin");
const password = process.env.MONGO_ARTIE_PASSWORD;
if (!password) {
  throw new Error("MONGO_ARTIE_PASSWORD is required");
}

const roleName = "artie_change_stream_reader";
const rolePrivileges = [
  {
    resource: { db: "terra", collection: "" },
    actions: ["find", "changeStream"],
  },
];
const inheritedRoles = [];

if (admin.getRole(roleName, { showPrivileges: false }) === null) {
  admin.createRole({
    role: roleName,
    privileges: rolePrivileges,
    roles: inheritedRoles,
  });
} else {
  admin.updateRole(roleName, {
    privileges: rolePrivileges,
    roles: inheritedRoles,
  });
}

const userDefinition = {
  pwd: password,
  roles: [{ role: roleName, db: "admin" }],
};
if (admin.getUser("artie") === null) {
  admin.createUser({ user: "artie", ...userDefinition });
} else {
  admin.updateUser("artie", userDefinition);
}
