using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PreOrderApp.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""Organization"" (
                    ""OrganizationId""      uuid        NOT NULL,
                    ""OrganizationName""    text        NOT NULL,
                    ""PrimaryEmail""        text        NOT NULL,
                    ""AddressLine1""        text,
                    ""AddressLine2""        text,
                    ""AddressLine3""        text,
                    ""Locality""            text,
                    ""Region""              text,
                    ""PostalCode""          text,
                    ""CountryCode""         text,
                    ""RegistrationToken""   text        NOT NULL,
                    ""IsEnabled""           boolean     NOT NULL,
                    ""CreatedOn""           timestamp with time zone NOT NULL,
                    ""ModifiedOn""          timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_Organization"" PRIMARY KEY (""OrganizationId"")
                );
            ");

            migrationBuilder.Sql(@"
                CREATE TABLE IF NOT EXISTS ""Order"" (
                    ""Id""             uuid    NOT NULL,
                    ""OrganizationId"" uuid    NOT NULL,
                    ""CustomerName""   text,
                    ""OrderDate""      timestamp with time zone NOT NULL,
                    CONSTRAINT ""PK_Order"" PRIMARY KEY (""Id"")
                );
            ");

            // Add FK only if it doesn't already exist (PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS)
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.table_constraints
                        WHERE constraint_name = 'FK_Order_Organization_OrganizationId'
                          AND table_name = 'Order'
                    ) THEN
                        ALTER TABLE ""Order""
                            ADD CONSTRAINT ""FK_Order_Organization_OrganizationId""
                            FOREIGN KEY (""OrganizationId"")
                            REFERENCES ""Organization"" (""OrganizationId"")
                            ON DELETE CASCADE;
                    END IF;
                END $$;
            ");

            migrationBuilder.Sql(@"CREATE INDEX IF NOT EXISTS ""IX_Order_OrganizationId"" ON ""Order"" (""OrganizationId"");");
            migrationBuilder.Sql(@"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Organization_PrimaryEmail"" ON ""Organization"" (""PrimaryEmail"");");
            migrationBuilder.Sql(@"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Organization_RegistrationToken"" ON ""Organization"" (""RegistrationToken"");");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""Order"";");
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""Organization"";");
        }
    }
}
