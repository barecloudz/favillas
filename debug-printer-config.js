#!/usr/bin/env node

/**
 * Debug script to check printer configuration persistence
 * Run this to see exactly what's happening with your printer settings
 */

import { storage } from './server/storage.js';

async function debugPrinterConfig() {
  console.log("🔍 Debugging Printer Configuration");
  console.log("===================================");

  try {
    // Step 1: Check all printer configs in database
    console.log("\n📋 Step 1: All printer configurations in database:");
    const allPrinters = await storage.getAllPrinterConfigs();
    
    if (allPrinters.length === 0) {
      console.log("❌ NO PRINTER CONFIGURATIONS FOUND IN DATABASE");
      console.log("   This is why your changes aren't taking effect!");
      console.log("   The system falls back to environment variable.");
      console.log("   \n💡 Solution: Add a printer in Admin Dashboard → Printer section");
      return;
    }

    allPrinters.forEach((printer, index) => {
      console.log(`\n   Printer ${index + 1}:`);
      console.log(`   ID: ${printer.id}`);
      console.log(`   Name: ${printer.name}`);
      console.log(`   IP Address: ${printer.ipAddress}`);
      console.log(`   Port: ${printer.port}`);
      console.log(`   Is Active: ${printer.isActive}`);
      console.log(`   Is Primary: ${printer.isPrimary}`);
      console.log(`   Connection Status: ${printer.connectionStatus}`);
      console.log(`   Created: ${printer.createdAt}`);
      console.log(`   Updated: ${printer.updatedAt}`);
    });

    // Step 2: Check primary printer specifically
    console.log("\n🎯 Step 2: Primary printer configuration:");
    const primaryPrinter = await storage.getPrimaryPrinterConfig();
    
    if (!primaryPrinter) {
      console.log("❌ NO PRIMARY PRINTER FOUND");
      console.log("   You have printers in database, but none is set as primary!");
      console.log("   💡 Solution: Set one printer as primary in the admin dashboard");
      return;
    }

    console.log("✅ Primary printer found:");
    console.log(`   ID: ${primaryPrinter.id}`);
    console.log(`   Name: ${primaryPrinter.name}`);
    console.log(`   IP Address: ${primaryPrinter.ipAddress}`);
    console.log(`   Port: ${primaryPrinter.port}`);
    console.log(`   Is Active: ${primaryPrinter.isActive}`);

    // Step 3: Check if primary printer is active
    if (!primaryPrinter.isActive) {
      console.log("❌ PRIMARY PRINTER IS NOT ACTIVE");
      console.log("   The printer exists but is disabled!");
      console.log("   💡 Solution: Enable the printer in admin dashboard");
      return;
    }

    // Step 4: Show what address would be used
    const address = primaryPrinter.port === 80 ? 
      primaryPrinter.ipAddress : 
      `${primaryPrinter.ipAddress}:${primaryPrinter.port}`;

    console.log(`\n📍 Step 3: Printer address that will be used:`);
    console.log(`   ${address}`);

    // Step 5: Test creating and updating a printer config
    console.log("\n🧪 Step 4: Testing printer config operations...");
    
    // Test creating a new printer (don't set as primary to avoid conflicts)
    console.log("   Creating test printer...");
    const testPrinter = await storage.createPrinterConfig({
      name: 'Test Printer',
      ipAddress: '192.168.1.999',
      port: 80,
      printerType: 'Epson TM-M30II',
      isActive: false,
      isPrimary: false
    });
    console.log(`   ✅ Test printer created with ID: ${testPrinter.id}`);

    // Test updating the printer
    console.log("   Updating test printer IP...");
    const updatedPrinter = await storage.updatePrinterConfig(testPrinter.id, {
      ipAddress: '192.168.1.888'
    });
    console.log(`   ✅ Test printer updated. New IP: ${updatedPrinter?.ipAddress}`);

    // Clean up test printer
    console.log("   Cleaning up test printer...");
    await storage.deletePrinterConfig(testPrinter.id);
    console.log("   ✅ Test printer deleted");

    console.log("\n🎉 Printer configuration system is working correctly!");
    console.log("   If your changes still aren't taking effect, check:");
    console.log("   1. Is your printer set as PRIMARY?");
    console.log("   2. Is your printer set as ACTIVE?");
    console.log("   3. Try restarting the server after making changes");

  } catch (error) {
    console.error("\n❌ Error during debugging:", error.message);
    console.error("Full error:", error);
    
    // Check if it's a database connection issue
    if (error.message.includes('relation') || error.message.includes('table')) {
      console.log("\n💡 This looks like a database schema issue.");
      console.log("   The printer_config table might not exist.");
      console.log("   Run the database migration: npm run db:migrate");
    }
  }
}

// Run the debug
debugPrinterConfig().catch(error => {
  console.error("Script execution failed:", error);
  process.exit(1);
});

console.log("This script will help diagnose why printer IP changes aren't taking effect.");
console.log("Common issues:");
console.log("1. No printer configuration exists in database");
console.log("2. Printer exists but isn't set as 'primary'");
console.log("3. Printer exists but isn't set as 'active'");
console.log("4. Database schema/migration issues");
console.log("");