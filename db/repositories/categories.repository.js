async function findActiveCategories(connection) {
  var sql =
    'SELECT ID, NAME, SLUG, DISPLAY_ORDER, IS_ACTIVE ' +
    'FROM BBS_CATEGORY WHERE IS_ACTIVE = 1 ORDER BY DISPLAY_ORDER ASC, ID ASC';
  return connection.execute(sql);
}

async function findAllCategories(connection) {
  var sql =
    'SELECT ID, NAME, SLUG, DISPLAY_ORDER, IS_ACTIVE, ' +
    "TO_CHAR(REGDATE, 'yyyy-mm-dd hh24:mi:ss') AS REGDATE " +
    'FROM BBS_CATEGORY ORDER BY DISPLAY_ORDER ASC, ID ASC';
  return connection.execute(sql);
}

async function findCategoryBySlug(connection, slug) {
  return connection.execute(
    'SELECT ID, NAME, SLUG, IS_ACTIVE FROM BBS_CATEGORY WHERE SLUG = :slug',
    {
      slug: slug
    }
  );
}

async function findActiveCategoryById(connection, categoryId) {
  var sql = 'SELECT ID, NAME, SLUG FROM BBS_CATEGORY WHERE ID = :categoryId AND IS_ACTIVE = 1';
  return connection.execute(sql, { categoryId: categoryId });
}

async function createCategory(connection, name, slug, displayOrder) {
  var sql =
    'INSERT INTO BBS_CATEGORY(ID, NAME, SLUG, DISPLAY_ORDER, IS_ACTIVE, REGDATE) ' +
    'VALUES(BBS_CATEGORY_SEQ.NEXTVAL, :name, :slug, :displayOrder, 1, SYSDATE)';
  return connection.execute(
    sql,
    { name: name, slug: slug, displayOrder: displayOrder },
    { autoCommit: false }
  );
}

async function updateCategory(connection, categoryId, name, slug, displayOrder) {
  var sql =
    'UPDATE BBS_CATEGORY SET NAME = :name, SLUG = :slug, DISPLAY_ORDER = :displayOrder ' +
    'WHERE ID = :categoryId';
  return connection.execute(
    sql,
    { categoryId: categoryId, name: name, slug: slug, displayOrder: displayOrder },
    { autoCommit: false }
  );
}

async function setCategoryActive(connection, categoryId, isActive) {
  var sql = 'UPDATE BBS_CATEGORY SET IS_ACTIVE = :isActive WHERE ID = :categoryId';
  return connection.execute(
    sql,
    { categoryId: categoryId, isActive: isActive ? 1 : 0 },
    { autoCommit: false }
  );
}

async function countCategories(connection) {
  return connection.execute('SELECT COUNT(*) FROM BBS_CATEGORY');
}

module.exports = {
  findActiveCategories: findActiveCategories,
  findAllCategories: findAllCategories,
  findCategoryBySlug: findCategoryBySlug,
  findActiveCategoryById: findActiveCategoryById,
  createCategory: createCategory,
  updateCategory: updateCategory,
  setCategoryActive: setCategoryActive,
  countCategories: countCategories
};
