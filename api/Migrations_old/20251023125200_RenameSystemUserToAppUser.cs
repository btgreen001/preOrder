using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PreOrderApp.Migrations
{
    [Migration("20251023125200_RenameSystemUserToAppUser")]
    public partial class RenameSystemUserToAppUser : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM pg_tables 
                        WHERE schemaname = 'public' 
                        AND tablename = 'system_user'
                    ) THEN
                        ALTER TABLE public.system_user RENAME TO app_user;
                    END IF;
                END
                $$;
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM pg_tables 
                        WHERE schemaname = 'public' 
                        AND tablename = 'app_user'
                    ) THEN
                        ALTER TABLE public.app_user RENAME TO system_user;
                    END IF;
                END
                $$;
            ");
        }
    }
}
