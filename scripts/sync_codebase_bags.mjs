import fs from 'fs';
import { YINDII_BAG_UPDATES } from './update_all_bags_yindii.mjs';

// 1. Update apps/customer/src/services/customer.service.ts
const customerServicePath = 'apps/customer/src/services/customer.service.ts';
let customerContent = fs.readFileSync(customerServicePath, 'utf8');

// Match bag objects in HANOI_BAGS
// Each bag has "id": "...", "name": "...", "description": "..."
let updatedCustomerCount = 0;
for (const [id, update] of Object.entries(YINDII_BAG_UPDATES)) {
  // Regex to match "id": "${id}" ... "name": "..." ... "description": "..."
  const idRegex = new RegExp(`("id":\\s*"${id}"[\\s\\S]*?"name":\\s*")[^"]*(")`, 'g');
  if (idRegex.test(customerContent)) {
    customerContent = customerContent.replace(idRegex, `$1${update.name}$2`);
    
    // Also update description
    const descRegex = new RegExp(`("id":\\s*"${id}"[\\s\\S]*?"description":\\s*")[^"]*(")`, 'g');
    customerContent = customerContent.replace(descRegex, `$1${update.description.replace(/"/g, '\\"')}$2`);
    updatedCustomerCount++;
  }
}

fs.writeFileSync(customerServicePath, customerContent, 'utf8');
console.log(`Updated ${updatedCustomerCount} bags in customer.service.ts`);

// 2. Update scripts/seed_34_partners_and_bags.mjs
const seedBagsPath = 'scripts/seed_34_partners_and_bags.mjs';
let seedContent = fs.readFileSync(seedBagsPath, 'utf8');

let updatedSeedCount = 0;
for (const [id, update] of Object.entries(YINDII_BAG_UPDATES)) {
  const idRegex = new RegExp(`("id":\\s*"${id}"[\\s\\S]*?"name":\\s*")[^"]*(")`, 'g');
  if (idRegex.test(seedContent)) {
    seedContent = seedContent.replace(idRegex, `$1${update.name}$2`);
    
    const descRegex = new RegExp(`("id":\\s*"${id}"[\\s\\S]*?"description":\\s*")[^"]*(")`, 'g');
    seedContent = seedContent.replace(descRegex, `$1${update.description.replace(/"/g, '\\"')}$2`);
    updatedSeedCount++;
  }
}

fs.writeFileSync(seedBagsPath, seedContent, 'utf8');
console.log(`Updated ${updatedSeedCount} bags in seed_34_partners_and_bags.mjs`);
