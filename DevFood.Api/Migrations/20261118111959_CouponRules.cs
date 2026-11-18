using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevFood.Api.Migrations
{
    /// <inheritdoc />
    public partial class CouponRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "coupons",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "discount_type",
                table: "coupons",
                type: "text",
                nullable: false,
                defaultValue: "percent");

            migrationBuilder.AddColumn<decimal>(
                name: "fixed_amount",
                table: "coupons",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "is_disabled",
                table: "coupons",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "max_discount",
                table: "coupons",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "per_user_limit",
                table: "coupons",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "starts_at",
                table: "coupons",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "usage_limit",
                table: "coupons",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "description",
                table: "coupons");

            migrationBuilder.DropColumn(
                name: "discount_type",
                table: "coupons");

            migrationBuilder.DropColumn(
                name: "fixed_amount",
                table: "coupons");

            migrationBuilder.DropColumn(
                name: "is_disabled",
                table: "coupons");

            migrationBuilder.DropColumn(
                name: "max_discount",
                table: "coupons");

            migrationBuilder.DropColumn(
                name: "per_user_limit",
                table: "coupons");

            migrationBuilder.DropColumn(
                name: "starts_at",
                table: "coupons");

            migrationBuilder.DropColumn(
                name: "usage_limit",
                table: "coupons");
        }
    }
}
