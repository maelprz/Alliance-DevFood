using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevFood.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20261106120000_AdminSoftDeletes")]
    public partial class AdminSoftDeletes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(name: "is_deleted", table: "menu_items", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "is_deleted", table: "coupons", type: "boolean", nullable: false, defaultValue: false);
            migrationBuilder.AddColumn<bool>(name: "is_deleted", table: "notifications", type: "boolean", nullable: false, defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "is_deleted", table: "menu_items");
            migrationBuilder.DropColumn(name: "is_deleted", table: "coupons");
            migrationBuilder.DropColumn(name: "is_deleted", table: "notifications");
        }
    }
}
