
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";
const RESTRICT_VIOLATION = "23001";

function isUniqueViolation(err) {
  return err.code === UNIQUE_VIOLATION;
}

function isForeignKeyViolation(err) {
  return err.code === FOREIGN_KEY_VIOLATION || err.code === RESTRICT_VIOLATION;
}

module.exports = { isUniqueViolation, isForeignKeyViolation };
