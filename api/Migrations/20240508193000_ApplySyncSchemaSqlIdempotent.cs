using System;
using System.IO;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PreOrderApp.Migrations
{
    public partial class ApplySyncSchemaSqlIdempotent : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var scriptPath = Path.Combine(AppContext.BaseDirectory, "Database", "sync_schema.sql");
            if (!File.Exists(scriptPath))
            {
                throw new FileNotFoundException($"Required schema script not found: {scriptPath}");
            }

            var script = File.ReadAllText(scriptPath);

            // The script includes its own BEGIN/COMMIT; remove them so EF controls the transaction.
            script = script.Replace("BEGIN;", string.Empty, StringComparison.OrdinalIgnoreCase)
                           .Replace("COMMIT;", string.Empty, StringComparison.OrdinalIgnoreCase);

            migrationBuilder.Sql(script);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally no-op: this migration applies idempotent schema guards.
        }
    }
}
