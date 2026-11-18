using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevFood.Api.Migrations
{
    /// <inheritdoc />
    public partial class AdminHideOrders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "is_hidden_from_admin",
                table: "orders",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "is_hidden_from_admin",
                table: "orders");
        }
    }
}
