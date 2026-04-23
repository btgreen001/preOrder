using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OrderMgmt.Migrations
{
    /// <inheritdoc />
    [Migration("20251023125200_RenameSystemUserToAppUser")]
    public partial class RenameSystemUserToAppUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE public.system_user RENAME TO app_user;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE public.app_user RENAME TO system_user;");
        }
    }
}
