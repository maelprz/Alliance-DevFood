using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace DevFood.Api.Migrations
{
    /// <inheritdoc />
    public partial class RoleBasedAccessControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "role",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "customer",
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateTable(
                name: "permissions",
                columns: table => new
                {
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_permissions", x => x.name);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    name = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roles", x => x.name);
                });

            migrationBuilder.CreateTable(
                name: "role_permissions",
                columns: table => new
                {
                    role_name = table.Column<string>(type: "text", nullable: false),
                    permission_name = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_role_permissions", x => new { x.role_name, x.permission_name });
                    table.ForeignKey(
                        name: "fk_role_permissions_permissions_permission_name",
                        column: x => x.permission_name,
                        principalTable: "permissions",
                        principalColumn: "name",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_role_permissions_roles_role_name",
                        column: x => x.role_name,
                        principalTable: "roles",
                        principalColumn: "name",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "permissions",
                columns: new[] { "name", "description" },
                values: new object[,]
                {
                    { "admin.panel", "Open the admin panel" },
                    { "notifications.read_own", "Read and mark own notifications" },
                    { "profile.manage_own", "View and edit own profile and password" },
                    { "users.deactivate", "Deactivate or reactivate customer accounts" },
                    { "users.view", "List and search registered users" }
                });

            migrationBuilder.InsertData(
                table: "roles",
                columns: new[] { "name", "description" },
                values: new object[,]
                {
                    { "admin", "Staff member who manages the system" },
                    { "customer", "Registered customer who orders food" }
                });

            migrationBuilder.InsertData(
                table: "role_permissions",
                columns: new[] { "permission_name", "role_name" },
                values: new object[,]
                {
                    { "admin.panel", "admin" },
                    { "notifications.read_own", "admin" },
                    { "profile.manage_own", "admin" },
                    { "users.deactivate", "admin" },
                    { "users.view", "admin" },
                    { "notifications.read_own", "customer" },
                    { "profile.manage_own", "customer" }
                });

            migrationBuilder.CreateIndex(
                name: "ix_users_role",
                table: "users",
                column: "role");

            migrationBuilder.CreateIndex(
                name: "ix_role_permissions_permission_name",
                table: "role_permissions",
                column: "permission_name");

            migrationBuilder.AddForeignKey(
                name: "fk_users_roles_role",
                table: "users",
                column: "role",
                principalTable: "roles",
                principalColumn: "name",
                onDelete: ReferentialAction.Restrict);

            // Same as the earlier migrations: keep Supabase's REST API out of these tables.
            foreach (var table in new[] { "roles", "permissions", "role_permissions" })
                migrationBuilder.Sql($"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_users_roles_role",
                table: "users");

            migrationBuilder.DropTable(
                name: "role_permissions");

            migrationBuilder.DropTable(
                name: "permissions");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropIndex(
                name: "ix_users_role",
                table: "users");

            migrationBuilder.AlterColumn<string>(
                name: "role",
                table: "users",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "customer");
        }
    }
}
