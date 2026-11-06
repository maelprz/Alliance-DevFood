using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevFood.Api.Migrations
{
    /// <inheritdoc />
    public partial class OrderDeliveryLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "delivery_lat",
                table: "orders",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "delivery_lng",
                table: "orders",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "delivery_lat",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "delivery_lng",
                table: "orders");
        }
    }
}
