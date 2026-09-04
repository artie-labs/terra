const admin = db.getSiblingDB("admin");
const password = process.env.MONGO_ARTIE_PASSWORD;
if (!password) {
  throw new Error("MONGO_ARTIE_PASSWORD is required");
}
const roleName = "artie_change_stream_reader";
const roleDefinition = {
  privileges: [
    {
      resource: { db: "terra", collection: "" },
      actions: ["find", "changeStream"],
    },
  ],
  roles: [],
};

if (admin.getRole(roleName, { showPrivileges: false }) === null) {
  admin.createRole(roleName, roleDefinition);
} else {
  admin.updateRole(roleName, roleDefinition);
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
