/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('instances', function (table) {
    table.increments('id').primary();
    table.string('instance').notNullable().unique();
    table.string('status').defaultTo('disconnected');
    table.text('qrcode_or_pairingcode');
    table.timestamp('qr_expires_at');
    table.string('phone');
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('instances');
};
