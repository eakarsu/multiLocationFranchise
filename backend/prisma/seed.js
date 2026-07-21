const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DESTRUCTIVE_DEMO_SEED !== 'true') {
  throw new Error(
    'Refusing destructive demo seed. Use a disposable non-production database and set ALLOW_DESTRUCTIVE_DEMO_SEED=true.',
  );
}

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Clean up existing data first (in reverse dependency order)
  console.log('Cleaning up existing data...');
  await prisma.message.deleteMany();
  await prisma.issueReport.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.knowledgeArticle.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.complianceAudit.deleteMany();
  await prisma.performanceData.deleteMany();
  await prisma.financialData.deleteMany();
  await prisma.bestPractice.deleteMany();
  await prisma.sOP.deleteMany();
  await prisma.checklistCompletion.deleteMany();
  await prisma.operationalChecklistItem.deleteMany();
  await prisma.operationalChecklist.deleteMany();
  await prisma.complianceChecklistItem.deleteMany();
  await prisma.complianceChecklist.deleteMany();
  await prisma.trainingMaterial.deleteMany();
  await prisma.approvedVendor.deleteMany();
  await prisma.marketingTemplate.deleteMany();
  await prisma.brandGuideline.deleteMany();
  await prisma.localPricing.deleteMany();
  await prisma.product.deleteMany();
  await prisma.royaltyPayment.deleteMany();
  await prisma.aIAnalysis.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.operatingHours.deleteMany();
  await prisma.location.deleteMany();
  await prisma.territory.deleteMany();
  await prisma.systemSetting.deleteMany();
  console.log('Cleanup complete.');

  // Create territories (15+)
  const territories = await Promise.all([
    prisma.territory.create({ data: { name: 'Northeast', region: 'East', description: 'NY, NJ, CT, MA, PA' } }),
    prisma.territory.create({ data: { name: 'Southeast', region: 'East', description: 'FL, GA, NC, SC, VA' } }),
    prisma.territory.create({ data: { name: 'Mid-Atlantic', region: 'East', description: 'MD, DE, DC area' } }),
    prisma.territory.create({ data: { name: 'Midwest', region: 'Central', description: 'IL, OH, MI, IN, WI' } }),
    prisma.territory.create({ data: { name: 'Central Plains', region: 'Central', description: 'MO, KS, NE, IA' } }),
    prisma.territory.create({ data: { name: 'Mountain', region: 'West', description: 'CO, UT, WY, MT' } }),
    prisma.territory.create({ data: { name: 'Southwest', region: 'West', description: 'TX, AZ, NM, OK' } }),
    prisma.territory.create({ data: { name: 'Pacific Northwest', region: 'West', description: 'WA, OR, ID' } }),
    prisma.territory.create({ data: { name: 'California North', region: 'West', description: 'Northern California' } }),
    prisma.territory.create({ data: { name: 'California South', region: 'West', description: 'Southern California' } }),
    prisma.territory.create({ data: { name: 'Great Lakes', region: 'Central', description: 'MN, WI, MI Upper Peninsula' } }),
    prisma.territory.create({ data: { name: 'Gulf Coast', region: 'South', description: 'LA, MS, AL coastal' } }),
    prisma.territory.create({ data: { name: 'New England', region: 'East', description: 'ME, NH, VT, RI' } }),
    prisma.territory.create({ data: { name: 'Carolinas', region: 'East', description: 'NC, SC expanded' } }),
    prisma.territory.create({ data: { name: 'Florida', region: 'South', description: 'FL statewide' } }),
    prisma.territory.create({ data: { name: 'Texas', region: 'South', description: 'TX statewide' } })
  ]);

  console.log('Created 16 territories');

  // Create locations (20+)
  const locationData = [
    { name: 'Downtown Manhattan', code: 'NYC-001', address: '123 Broadway', city: 'New York', state: 'NY', zipCode: '10001', phone: '212-555-0101', territoryIdx: 0 },
    { name: 'Brooklyn Heights', code: 'NYC-002', address: '456 Atlantic Ave', city: 'Brooklyn', state: 'NY', zipCode: '11201', phone: '718-555-0102', territoryIdx: 0 },
    { name: 'Miami Beach', code: 'MIA-001', address: '789 Ocean Drive', city: 'Miami', state: 'FL', zipCode: '33139', phone: '305-555-0103', territoryIdx: 14 },
    { name: 'Wynwood', code: 'MIA-002', address: '321 NW 2nd Ave', city: 'Miami', state: 'FL', zipCode: '33127', phone: '305-555-0104', territoryIdx: 14 },
    { name: 'Chicago Loop', code: 'CHI-001', address: '100 Michigan Ave', city: 'Chicago', state: 'IL', zipCode: '60601', phone: '312-555-0105', territoryIdx: 3 },
    { name: 'Wicker Park', code: 'CHI-002', address: '1600 N Milwaukee', city: 'Chicago', state: 'IL', zipCode: '60622', phone: '312-555-0106', territoryIdx: 3 },
    { name: 'Austin Downtown', code: 'AUS-001', address: '400 Congress Ave', city: 'Austin', state: 'TX', zipCode: '78701', phone: '512-555-0107', territoryIdx: 15 },
    { name: 'Austin South', code: 'AUS-002', address: '2000 S Lamar Blvd', city: 'Austin', state: 'TX', zipCode: '78704', phone: '512-555-0108', territoryIdx: 15 },
    { name: 'San Francisco Union', code: 'SFO-001', address: '555 Market St', city: 'San Francisco', state: 'CA', zipCode: '94105', phone: '415-555-0109', territoryIdx: 8 },
    { name: 'SOMA', code: 'SFO-002', address: '888 Howard St', city: 'San Francisco', state: 'CA', zipCode: '94103', phone: '415-555-0110', territoryIdx: 8 },
    { name: 'Boston Back Bay', code: 'BOS-001', address: '200 Boylston St', city: 'Boston', state: 'MA', zipCode: '02116', phone: '617-555-0111', territoryIdx: 0 },
    { name: 'Cambridge', code: 'BOS-002', address: '100 Mass Ave', city: 'Cambridge', state: 'MA', zipCode: '02139', phone: '617-555-0112', territoryIdx: 0 },
    { name: 'Denver LoDo', code: 'DEN-001', address: '1600 Wazee St', city: 'Denver', state: 'CO', zipCode: '80202', phone: '303-555-0113', territoryIdx: 5 },
    { name: 'Seattle Downtown', code: 'SEA-001', address: '600 Pine St', city: 'Seattle', state: 'WA', zipCode: '98101', phone: '206-555-0114', territoryIdx: 7 },
    { name: 'Capitol Hill', code: 'SEA-002', address: '1500 Broadway', city: 'Seattle', state: 'WA', zipCode: '98122', phone: '206-555-0115', territoryIdx: 7 },
    { name: 'Los Angeles DTLA', code: 'LAX-001', address: '700 S Grand Ave', city: 'Los Angeles', state: 'CA', zipCode: '90017', phone: '213-555-0116', territoryIdx: 9 },
    { name: 'Santa Monica', code: 'LAX-002', address: '300 Santa Monica Blvd', city: 'Santa Monica', state: 'CA', zipCode: '90401', phone: '310-555-0117', territoryIdx: 9 },
    { name: 'Venice Beach', code: 'LAX-003', address: '100 Windward Ave', city: 'Venice', state: 'CA', zipCode: '90291', phone: '310-555-0118', territoryIdx: 9 },
    { name: 'Phoenix Downtown', code: 'PHX-001', address: '44 W Monroe St', city: 'Phoenix', state: 'AZ', zipCode: '85003', phone: '602-555-0119', territoryIdx: 6 },
    { name: 'Scottsdale', code: 'PHX-002', address: '7000 E Camelback', city: 'Scottsdale', state: 'AZ', zipCode: '85251', phone: '480-555-0120', territoryIdx: 6 }
  ];

  const locations = await Promise.all(
    locationData.map((loc, idx) => prisma.location.create({
      data: {
        name: loc.name,
        code: loc.code,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        zipCode: loc.zipCode,
        phone: loc.phone,
        email: `${loc.code.toLowerCase()}@franchise.com`,
        latitude: 40 + Math.random() * 10,
        longitude: -120 + Math.random() * 40,
        territoryId: territories[loc.territoryIdx].id,
        status: idx < 18 ? 'ACTIVE' : 'PENDING',
        openDate: new Date(2020 + Math.floor(idx / 5), idx % 12, 15)
      }
    }))
  );

  console.log('Created 20 locations');

  // Create operating hours for each location
  for (const location of locations) {
    const hours = [];
    for (let day = 0; day < 7; day++) {
      hours.push({
        locationId: location.id,
        dayOfWeek: day,
        openTime: day === 0 ? '10:00' : '08:00',
        closeTime: day === 0 ? '18:00' : '22:00',
        isClosed: false
      });
    }
    await prisma.operatingHours.createMany({ data: hours });
  }

  console.log('Created operating hours');

  // Create users (20+)
  const adminPassword = crypto.randomBytes(18).toString('base64url');
  const corporatePassword = crypto.randomBytes(18).toString('base64url');
  const managerPassword = crypto.randomBytes(18).toString('base64url');
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const hashedCorpPassword = await bcrypt.hash(corporatePassword, 12);
  const hashedManagerPassword = await bcrypt.hash(managerPassword, 12);

  const adminUser = await prisma.user.create({
    data: { email: 'admin@franchise.com', password: hashedPassword, firstName: 'System', lastName: 'Admin', role: 'SUPER_ADMIN', phone: '800-555-0000' }
  });

  const corporateUsers = await Promise.all([
    prisma.user.create({ data: { email: 'corporate@franchise.com', password: hashedCorpPassword, firstName: 'Corporate', lastName: 'Admin', role: 'CORPORATE_ADMIN', phone: '800-555-0001' } }),
    prisma.user.create({ data: { email: 'sarah.johnson@franchise.com', password: hashedCorpPassword, firstName: 'Sarah', lastName: 'Johnson', role: 'CORPORATE_ADMIN', phone: '800-555-0002' } }),
    prisma.user.create({ data: { email: 'mike.wilson@franchise.com', password: hashedCorpPassword, firstName: 'Mike', lastName: 'Wilson', role: 'CORPORATE_ADMIN', phone: '800-555-0003' } })
  ]);

  const regionalManagers = await Promise.all([
    prisma.user.create({ data: { email: 'rm.east@franchise.com', password: hashedManagerPassword, firstName: 'James', lastName: 'Brown', role: 'REGIONAL_MANAGER', phone: '800-555-0010' } }),
    prisma.user.create({ data: { email: 'rm.west@franchise.com', password: hashedManagerPassword, firstName: 'Lisa', lastName: 'Davis', role: 'REGIONAL_MANAGER', phone: '800-555-0011' } }),
    prisma.user.create({ data: { email: 'rm.central@franchise.com', password: hashedManagerPassword, firstName: 'Robert', lastName: 'Miller', role: 'REGIONAL_MANAGER', phone: '800-555-0012' } }),
    prisma.user.create({ data: { email: 'rm.south@franchise.com', password: hashedManagerPassword, firstName: 'Maria', lastName: 'Garcia', role: 'REGIONAL_MANAGER', phone: '800-555-0013' } })
  ]);

  const locationManagers = await Promise.all(
    locations.slice(0, 15).map((location, idx) => {
      const firstNames = ['John', 'Emily', 'David', 'Jessica', 'Michael', 'Ashley', 'Daniel', 'Amanda', 'Christopher', 'Stephanie', 'Matthew', 'Jennifer', 'Andrew', 'Nicole', 'Joshua'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
      return prisma.user.create({
        data: {
          email: `manager@${location.code.toLowerCase()}.franchise.com`,
          password: hashedManagerPassword,
          firstName: firstNames[idx],
          lastName: lastNames[idx],
          role: 'LOCATION_MANAGER',
          phone: `555-${100 + idx}-${1000 + idx}`,
          locationId: location.id
        }
      });
    })
  );

  console.log('Created 22+ users');

  // Create products (20+)
  await Promise.all([
    prisma.product.create({ data: { name: 'Classic Burger', sku: 'BURG-001', basePrice: 12.99, category: 'Burgers', description: 'Our signature classic burger with fresh ingredients' } }),
    prisma.product.create({ data: { name: 'Cheese Burger', sku: 'BURG-002', basePrice: 13.99, category: 'Burgers', description: 'Classic with melted American cheese' } }),
    prisma.product.create({ data: { name: 'Bacon Burger', sku: 'BURG-003', basePrice: 14.99, category: 'Burgers', description: 'Topped with crispy bacon strips' } }),
    prisma.product.create({ data: { name: 'Veggie Burger', sku: 'BURG-004', basePrice: 11.99, category: 'Burgers', description: 'Plant-based patty with fresh veggies' } }),
    prisma.product.create({ data: { name: 'Double Burger', sku: 'BURG-005', basePrice: 16.99, category: 'Burgers', description: 'Two patties for the hungry' } }),
    prisma.product.create({ data: { name: 'Mushroom Swiss', sku: 'BURG-006', basePrice: 14.99, category: 'Burgers', description: 'Sautéed mushrooms and Swiss cheese' } }),
    prisma.product.create({ data: { name: 'BBQ Burger', sku: 'BURG-007', basePrice: 14.49, category: 'Burgers', description: 'Smothered in tangy BBQ sauce' } }),
    prisma.product.create({ data: { name: 'French Fries', sku: 'SIDE-001', basePrice: 4.99, category: 'Sides', description: 'Crispy golden fries' } }),
    prisma.product.create({ data: { name: 'Onion Rings', sku: 'SIDE-002', basePrice: 5.99, category: 'Sides', description: 'Beer-battered onion rings' } }),
    prisma.product.create({ data: { name: 'Sweet Potato Fries', sku: 'SIDE-003', basePrice: 5.99, category: 'Sides', description: 'Crispy sweet potato fries' } }),
    prisma.product.create({ data: { name: 'Cole Slaw', sku: 'SIDE-004', basePrice: 3.99, category: 'Sides', description: 'Creamy homemade cole slaw' } }),
    prisma.product.create({ data: { name: 'Side Salad', sku: 'SIDE-005', basePrice: 4.99, category: 'Sides', description: 'Fresh mixed greens' } }),
    prisma.product.create({ data: { name: 'Soft Drink', sku: 'BVRG-001', basePrice: 2.99, category: 'Beverages', description: 'Fountain drink, free refills' } }),
    prisma.product.create({ data: { name: 'Milkshake', sku: 'BVRG-002', basePrice: 5.99, category: 'Beverages', description: 'Hand-spun milkshake' } }),
    prisma.product.create({ data: { name: 'Iced Tea', sku: 'BVRG-003', basePrice: 2.49, category: 'Beverages', description: 'Fresh brewed iced tea' } }),
    prisma.product.create({ data: { name: 'Lemonade', sku: 'BVRG-004', basePrice: 2.99, category: 'Beverages', description: 'Fresh squeezed lemonade' } }),
    prisma.product.create({ data: { name: 'Coffee', sku: 'BVRG-005', basePrice: 2.49, category: 'Beverages', description: 'Freshly brewed coffee' } }),
    prisma.product.create({ data: { name: 'Chocolate Brownie', sku: 'DSRT-001', basePrice: 4.99, category: 'Desserts', description: 'Warm chocolate brownie' } }),
    prisma.product.create({ data: { name: 'Ice Cream Sundae', sku: 'DSRT-002', basePrice: 5.99, category: 'Desserts', description: 'Vanilla ice cream with toppings' } }),
    prisma.product.create({ data: { name: 'Apple Pie', sku: 'DSRT-003', basePrice: 4.99, category: 'Desserts', description: 'Classic apple pie slice' } })
  ]);

  console.log('Created 20 products');

  // Create brand guidelines (15+)
  await Promise.all([
    prisma.brandGuideline.create({ data: { title: 'Logo Usage Guidelines', category: 'Visual Identity', content: 'The company logo must be displayed prominently at all locations. Minimum size: 24 inches for exterior, 12 inches for interior.', version: '2.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Color Standards', category: 'Visual Identity', content: 'Primary: #FF5722 (Orange), #212121 (Dark Gray). Secondary: #FFFFFF, #FAFAFA. Use Pantone equivalents for print.', version: '2.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Typography Standards', category: 'Visual Identity', content: 'Primary: Montserrat Bold for headings. Secondary: Open Sans for body text. Minimum font size: 12pt for menus.', version: '1.5' } }),
    prisma.brandGuideline.create({ data: { title: 'Photography Style', category: 'Visual Identity', content: 'Food photography must use natural lighting, warm tones. Show food at eye level. Background should be clean and minimal.', version: '1.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Customer Service Standards', category: 'Service', content: 'Greet customers within 30 seconds. Standard greeting: "Welcome to [Location]! How can I help you today?"', version: '1.5' } }),
    prisma.brandGuideline.create({ data: { title: 'Phone Etiquette', category: 'Service', content: 'Answer within 3 rings. Standard greeting: "Thank you for calling [Location], this is [Name]. How may I help you?"', version: '1.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Complaint Resolution', category: 'Service', content: 'LAST method: Listen, Apologize, Solve, Thank. Manager authority for comps up to $50 without approval.', version: '1.2' } }),
    prisma.brandGuideline.create({ data: { title: 'Uniform Standards', category: 'Appearance', content: 'Approved polo shirt, black pants, non-slip shoes. Shirts tucked in. Name badge visible at all times.', version: '2.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Grooming Standards', category: 'Appearance', content: 'Hair must be neat and contained. Minimal jewelry. No visible tattoos on face/neck. Clean nails.', version: '1.5' } }),
    prisma.brandGuideline.create({ data: { title: 'Store Layout Requirements', category: 'Interior', content: 'Minimum 40% seating capacity. Clear pathway to counter. ADA compliance required. Emergency exits clearly marked.', version: '1.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Menu Board Standards', category: 'Interior', content: 'Digital boards updated daily. Pricing clearly visible. Featured items highlighted. Allergen info available.', version: '1.5' } }),
    prisma.brandGuideline.create({ data: { title: 'Exterior Signage', category: 'Exterior', content: 'Main sign illuminated. Hours posted on door. Parking signs per local requirements. Clean facade daily.', version: '1.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Social Media Guidelines', category: 'Marketing', content: 'Use approved hashtags. Respond to comments within 24 hours. No political content. Share corporate promotions.', version: '2.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Music and Atmosphere', category: 'Interior', content: 'Approved playlist only. Volume: conversation level. Temperature 68-72°F. Lighting per specs.', version: '1.0' } }),
    prisma.brandGuideline.create({ data: { title: 'Food Presentation Standards', category: 'Operations', content: 'Consistent plating. Hot food at 140°F minimum. Cold food below 40°F. Garnish per photo standards.', version: '1.5' } }),
    prisma.brandGuideline.create({ data: { title: 'Packaging Guidelines', category: 'Operations', content: 'Use branded packaging only. Bag napkins and condiments. Include receipt in bag. Seal properly for delivery.', version: '1.0' } })
  ]);

  console.log('Created 16 brand guidelines');

  // Create marketing templates (15+)
  await Promise.all([
    prisma.marketingTemplate.create({ data: { name: 'Grand Opening Flyer', category: 'Print', description: 'Template for new location announcements', fileUrl: '/templates/grand-opening-flyer.pdf', thumbnail: '/templates/thumbnails/grand-opening.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Weekly Specials Flyer', category: 'Print', description: 'Weekly promotion template', fileUrl: '/templates/weekly-specials.pdf', thumbnail: '/templates/thumbnails/weekly.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Holiday Promotion', category: 'Print', description: 'Holiday-themed promotion flyer', fileUrl: '/templates/holiday-promo.pdf', thumbnail: '/templates/thumbnails/holiday.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Loyalty Card', category: 'Print', description: 'Customer loyalty punch card', fileUrl: '/templates/loyalty-card.pdf', thumbnail: '/templates/thumbnails/loyalty.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Social Media - New Product', category: 'Social Media', description: 'New menu item announcement', fileUrl: '/templates/social-new-product.psd', thumbnail: '/templates/thumbnails/social-product.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Social Media - Special Offer', category: 'Social Media', description: 'Discount or special offer post', fileUrl: '/templates/social-offer.psd', thumbnail: '/templates/thumbnails/social-offer.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Instagram Story Template', category: 'Social Media', description: 'IG story for daily specials', fileUrl: '/templates/ig-story.psd', thumbnail: '/templates/thumbnails/ig-story.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Facebook Cover', category: 'Social Media', description: 'Facebook page cover photo', fileUrl: '/templates/fb-cover.psd', thumbnail: '/templates/thumbnails/fb-cover.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Email Newsletter', category: 'Email', description: 'Monthly newsletter template', fileUrl: '/templates/newsletter.html', thumbnail: '/templates/thumbnails/newsletter.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Welcome Email', category: 'Email', description: 'New customer welcome email', fileUrl: '/templates/welcome-email.html', thumbnail: '/templates/thumbnails/welcome.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Birthday Email', category: 'Email', description: 'Customer birthday promotion', fileUrl: '/templates/birthday-email.html', thumbnail: '/templates/thumbnails/birthday.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Table Tent', category: 'Print', description: 'In-store table tent design', fileUrl: '/templates/table-tent.pdf', thumbnail: '/templates/thumbnails/table-tent.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Window Cling', category: 'Print', description: 'Promotional window cling', fileUrl: '/templates/window-cling.pdf', thumbnail: '/templates/thumbnails/window.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Banner - Indoor', category: 'Print', description: 'Indoor promotional banner', fileUrl: '/templates/banner-indoor.pdf', thumbnail: '/templates/thumbnails/banner.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Menu Insert', category: 'Print', description: 'Special menu insert template', fileUrl: '/templates/menu-insert.pdf', thumbnail: '/templates/thumbnails/menu.jpg' } }),
    prisma.marketingTemplate.create({ data: { name: 'Event Invitation', category: 'Email', description: 'Event invitation template', fileUrl: '/templates/event-invite.html', thumbnail: '/templates/thumbnails/event.jpg' } })
  ]);

  console.log('Created 16 marketing templates');

  // Create approved vendors (15+)
  await Promise.all([
    prisma.approvedVendor.create({ data: { name: 'Quality Foods Inc.', category: 'Food Supply', contactName: 'John Smith', contactEmail: 'john@qualityfoods.com', contactPhone: '800-555-1001', website: 'https://qualityfoods.com', notes: 'Primary food supplier. 48-hour delivery.' } }),
    prisma.approvedVendor.create({ data: { name: 'Fresh Produce Direct', category: 'Food Supply', contactName: 'Maria Santos', contactEmail: 'maria@freshproduce.com', contactPhone: '800-555-1002', website: 'https://freshproduce.com', notes: 'Daily fresh produce delivery available.' } }),
    prisma.approvedVendor.create({ data: { name: 'Premium Meats Co.', category: 'Food Supply', contactName: 'Bob Wilson', contactEmail: 'bob@premiummeats.com', contactPhone: '800-555-1003', website: 'https://premiummeats.com', notes: 'USDA certified. Organic options.' } }),
    prisma.approvedVendor.create({ data: { name: 'Bakery Supply Plus', category: 'Food Supply', contactName: 'Amy Chen', contactEmail: 'amy@bakerysupply.com', contactPhone: '800-555-1004', website: 'https://bakerysupply.com', notes: 'Buns and bakery items.' } }),
    prisma.approvedVendor.create({ data: { name: 'Clean Pro Services', category: 'Cleaning', contactName: 'Carlos Garcia', contactEmail: 'carlos@cleanpro.com', contactPhone: '800-555-1005', website: 'https://cleanpro.com', notes: 'Eco-friendly products available.' } }),
    prisma.approvedVendor.create({ data: { name: 'Spotless Solutions', category: 'Cleaning', contactName: 'Linda Brown', contactEmail: 'linda@spotless.com', contactPhone: '800-555-1006', website: 'https://spotless.com', notes: 'Commercial-grade supplies.' } }),
    prisma.approvedVendor.create({ data: { name: 'Uniform World', category: 'Uniforms', contactName: 'Steve Johnson', contactEmail: 'steve@uniformworld.com', contactPhone: '800-555-1007', website: 'https://uniformworld.com', notes: 'Bulk discount 50+ units.' } }),
    prisma.approvedVendor.create({ data: { name: 'TechPOS Solutions', category: 'Technology', contactName: 'Sarah Lee', contactEmail: 'sarah@techpos.com', contactPhone: '800-555-1008', website: 'https://techpos.com', notes: 'POS systems. 24/7 support.' } }),
    prisma.approvedVendor.create({ data: { name: 'Digital Signage Pro', category: 'Technology', contactName: 'Mike Davis', contactEmail: 'mike@digitalsignage.com', contactPhone: '800-555-1009', website: 'https://digitalsignage.com', notes: 'Menu boards and displays.' } }),
    prisma.approvedVendor.create({ data: { name: 'Kitchen Equipment Co.', category: 'Equipment', contactName: 'Tom White', contactEmail: 'tom@kitchenequip.com', contactPhone: '800-555-1010', website: 'https://kitchenequip.com', notes: 'Commercial kitchen equipment.' } }),
    prisma.approvedVendor.create({ data: { name: 'Refrigeration Plus', category: 'Equipment', contactName: 'Nancy Taylor', contactEmail: 'nancy@refrigplus.com', contactPhone: '800-555-1011', website: 'https://refrigplus.com', notes: 'Walk-in coolers, freezers.' } }),
    prisma.approvedVendor.create({ data: { name: 'Office Supplies Direct', category: 'Office', contactName: 'Paul Martin', contactEmail: 'paul@officesupplies.com', contactPhone: '800-555-1012', website: 'https://officesupplies.com', notes: 'Next-day delivery.' } }),
    prisma.approvedVendor.create({ data: { name: 'Print Solutions Inc.', category: 'Marketing', contactName: 'Jennifer Adams', contactEmail: 'jen@printsolutions.com', contactPhone: '800-555-1013', website: 'https://printsolutions.com', notes: 'Approved printer for marketing.' } }),
    prisma.approvedVendor.create({ data: { name: 'Packaging World', category: 'Packaging', contactName: 'David Kim', contactEmail: 'david@packagingworld.com', contactPhone: '800-555-1014', website: 'https://packagingworld.com', notes: 'Branded packaging supplier.' } }),
    prisma.approvedVendor.create({ data: { name: 'Safety First Supply', category: 'Safety', contactName: 'Lisa Moore', contactEmail: 'lisa@safetyfirst.com', contactPhone: '800-555-1015', website: 'https://safetyfirst.com', notes: 'Fire extinguishers, first aid.' } }),
    prisma.approvedVendor.create({ data: { name: 'Pest Control Experts', category: 'Maintenance', contactName: 'Mark Thompson', contactEmail: 'mark@pestcontrol.com', contactPhone: '800-555-1016', website: 'https://pestcontrol.com', notes: 'Monthly service plans.' } })
  ]);

  console.log('Created 16 approved vendors');

  // Create training materials (18+)
  await Promise.all([
    prisma.trainingMaterial.create({ data: { title: 'New Employee Orientation', category: 'Onboarding', description: 'Company culture and policies intro', contentType: 'video', contentUrl: '/training/orientation.mp4', duration: 45, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'Company History & Values', category: 'Onboarding', description: 'Learn about our brand story', contentType: 'video', contentUrl: '/training/company-history.mp4', duration: 20, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'Food Safety Certification', category: 'Safety', description: 'Required food safety training', contentType: 'document', contentUrl: '/training/food-safety.pdf', duration: 120, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'Allergen Awareness', category: 'Safety', description: 'Handling allergen concerns', contentType: 'video', contentUrl: 'https://www.youtube.com/embed/hVkKCGvLbHs', duration: 30, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'Fire Safety Training', category: 'Safety', description: 'Emergency fire procedures', contentType: 'video', contentUrl: '/training/fire-safety.mp4', duration: 25, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'First Aid Basics', category: 'Safety', description: 'Basic first aid for workplace', contentType: 'video', contentUrl: '/training/first-aid.mp4', duration: 40, isRequired: false } }),
    prisma.trainingMaterial.create({ data: { title: 'Customer Service Excellence', category: 'Service', description: 'Best practices for service', contentType: 'video', contentUrl: '/training/customer-service.mp4', duration: 30, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'Handling Difficult Customers', category: 'Service', description: 'Conflict resolution techniques', contentType: 'video', contentUrl: '/training/difficult-customers.mp4', duration: 25, isRequired: false } }),
    prisma.trainingMaterial.create({ data: { title: 'Upselling Techniques', category: 'Service', description: 'Increase average ticket size', contentType: 'video', contentUrl: '/training/upselling.mp4', duration: 20, isRequired: false } }),
    prisma.trainingMaterial.create({ data: { title: 'POS System Training', category: 'Operations', description: 'How to use the POS system', contentType: 'video', contentUrl: '/training/pos-training.mp4', duration: 30, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'Inventory Management', category: 'Operations', description: 'Stock control and ordering', contentType: 'document', contentUrl: '/training/inventory.pdf', duration: 25, isRequired: false } }),
    prisma.trainingMaterial.create({ data: { title: 'Opening Procedures', category: 'Operations', description: 'Daily opening tasks', contentType: 'video', contentUrl: '/training/opening.mp4', duration: 15, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'Closing Procedures', category: 'Operations', description: 'Daily closing tasks', contentType: 'video', contentUrl: '/training/closing.mp4', duration: 15, isRequired: true } }),
    prisma.trainingMaterial.create({ data: { title: 'Grill Station Training', category: 'Kitchen', description: 'Grill operation and safety', contentType: 'video', contentUrl: '/training/grill-station.mp4', duration: 35, isRequired: false } }),
    prisma.trainingMaterial.create({ data: { title: 'Prep Station Training', category: 'Kitchen', description: 'Food prep procedures', contentType: 'video', contentUrl: '/training/prep-station.mp4', duration: 30, isRequired: false } }),
    prisma.trainingMaterial.create({ data: { title: 'Manager Leadership', category: 'Management', description: 'Leadership skills for managers', contentType: 'video', contentUrl: '/training/leadership.mp4', duration: 60, isRequired: false } }),
    prisma.trainingMaterial.create({ data: { title: 'Scheduling Best Practices', category: 'Management', description: 'Effective staff scheduling', contentType: 'document', contentUrl: '/training/scheduling.pdf', duration: 20, isRequired: false } }),
    prisma.trainingMaterial.create({ data: { title: 'Food Safety Quiz', category: 'Safety', description: 'Assessment quiz', contentType: 'quiz', contentUrl: '/training/food-safety-quiz', duration: 15, isRequired: true } })
  ]);

  console.log('Created 18 training materials');

  // Create compliance checklists (6+)
  const complianceChecklists = await Promise.all([
    prisma.complianceChecklist.create({
      data: {
        name: 'Daily Cleanliness Audit',
        category: 'Cleanliness',
        description: 'Daily checklist for maintaining cleanliness',
        items: { create: [
          { item: 'Floors clean and dry', order: 0, isCritical: true },
          { item: 'Tables wiped and sanitized', order: 1, isCritical: true },
          { item: 'Restrooms cleaned and stocked', order: 2, isCritical: true },
          { item: 'Kitchen surfaces sanitized', order: 3, isCritical: true },
          { item: 'Trash emptied and bins clean', order: 4 },
          { item: 'Windows and glass clean', order: 5 },
          { item: 'Outdoor area tidy', order: 6 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: {
        name: 'Brand Standards Audit',
        category: 'Brand',
        description: 'Monthly brand compliance check',
        items: { create: [
          { item: 'Logo properly displayed', order: 0, isCritical: true },
          { item: 'Menu boards current', order: 1, isCritical: true },
          { item: 'Staff in proper uniform', order: 2, isCritical: true },
          { item: 'Marketing materials current', order: 3 },
          { item: 'Music playlist approved', order: 4 },
          { item: 'Lighting per standards', order: 5 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: {
        name: 'Food Safety Audit',
        category: 'Safety',
        description: 'Weekly food safety inspection',
        items: { create: [
          { item: 'Temperatures logged', order: 0, isCritical: true },
          { item: 'FIFO rotation followed', order: 1, isCritical: true },
          { item: 'Date labels on all items', order: 2, isCritical: true },
          { item: 'Handwashing stations stocked', order: 3, isCritical: true },
          { item: 'No expired products', order: 4, isCritical: true },
          { item: 'Proper food storage', order: 5 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: {
        name: 'Equipment Maintenance',
        category: 'Maintenance',
        description: 'Monthly equipment check',
        items: { create: [
          { item: 'Grill calibrated', order: 0 },
          { item: 'Fryer oil quality', order: 1 },
          { item: 'Refrigerator temps', order: 2, isCritical: true },
          { item: 'Ice machine cleaned', order: 3 },
          { item: 'HVAC filters checked', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: {
        name: 'Customer Experience Audit',
        category: 'Service',
        description: 'Secret shopper checklist',
        items: { create: [
          { item: 'Greeted within 30 seconds', order: 0, isCritical: true },
          { item: 'Order accuracy', order: 1, isCritical: true },
          { item: 'Food quality', order: 2, isCritical: true },
          { item: 'Wait time acceptable', order: 3 },
          { item: 'Staff friendly', order: 4 },
          { item: 'Facility clean', order: 5 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: {
        name: 'Security Audit',
        category: 'Security',
        description: 'Quarterly security review',
        items: { create: [
          { item: 'Cameras operational', order: 0, isCritical: true },
          { item: 'Safe secured', order: 1, isCritical: true },
          { item: 'Emergency exits clear', order: 2, isCritical: true },
          { item: 'Alarm system tested', order: 3 },
          { item: 'Key control current', order: 4 }
        ]}
      }
    })
  ]);

  // Additional compliance checklists to reach 15+
  const moreComplianceChecklists = await Promise.all([
    prisma.complianceChecklist.create({
      data: { name: 'Parking Lot & Exterior Audit', category: 'Exterior', description: 'Exterior appearance and parking lot check',
        items: { create: [
          { item: 'Parking lot clean', order: 0 },
          { item: 'Signage illuminated', order: 1, isCritical: true },
          { item: 'Landscaping maintained', order: 2 },
          { item: 'Drive-thru clean', order: 3 },
          { item: 'Dumpster area tidy', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: { name: 'Employee Health Compliance', category: 'Health', description: 'Employee health and hygiene check',
        items: { create: [
          { item: 'Handwashing compliance', order: 0, isCritical: true },
          { item: 'Glove usage proper', order: 1, isCritical: true },
          { item: 'Hair restraints worn', order: 2 },
          { item: 'No sick employees working', order: 3, isCritical: true },
          { item: 'Uniforms clean', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: { name: 'Delivery & Receiving Audit', category: 'Operations', description: 'Delivery receiving process check',
        items: { create: [
          { item: 'Invoices checked', order: 0 },
          { item: 'Temperatures verified', order: 1, isCritical: true },
          { item: 'Products properly stored', order: 2 },
          { item: 'No damaged goods accepted', order: 3 },
          { item: 'Receiving area clean', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: { name: 'ADA Compliance Audit', category: 'Compliance', description: 'Americans with Disabilities Act compliance',
        items: { create: [
          { item: 'Accessible entrance', order: 0, isCritical: true },
          { item: 'Accessible restrooms', order: 1, isCritical: true },
          { item: 'Accessible seating', order: 2 },
          { item: 'Signage visible', order: 3 },
          { item: 'Service counter accessible', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: { name: 'Fire Safety Compliance', category: 'Safety', description: 'Fire safety equipment and procedures check',
        items: { create: [
          { item: 'Extinguishers charged', order: 0, isCritical: true },
          { item: 'Exit signs lit', order: 1, isCritical: true },
          { item: 'Exits unblocked', order: 2, isCritical: true },
          { item: 'Sprinklers functional', order: 3, isCritical: true },
          { item: 'Fire plan posted', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: { name: 'Waste Management Audit', category: 'Environmental', description: 'Waste handling and recycling compliance',
        items: { create: [
          { item: 'Proper waste separation', order: 0 },
          { item: 'Grease trap maintained', order: 1 },
          { item: 'Recycling bins labeled', order: 2 },
          { item: 'Waste log up to date', order: 3 },
          { item: 'Dumpster schedule current', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: { name: 'Marketing Compliance', category: 'Marketing', description: 'Marketing materials and messaging compliance',
        items: { create: [
          { item: 'Only approved materials', order: 0, isCritical: true },
          { item: 'Prices current', order: 1 },
          { item: 'Promotions authorized', order: 2 },
          { item: 'Social media compliant', order: 3 },
          { item: 'No unauthorized signage', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: { name: 'Financial Controls Audit', category: 'Finance', description: 'Cash handling and financial controls check',
        items: { create: [
          { item: 'Safe secure', order: 0, isCritical: true },
          { item: 'Cash counts documented', order: 1, isCritical: true },
          { item: 'Deposits timely', order: 2 },
          { item: 'Void procedures followed', order: 3 },
          { item: 'POS access controls', order: 4 }
        ]}
      }
    }),
    prisma.complianceChecklist.create({
      data: { name: 'Training Compliance Audit', category: 'Training', description: 'Staff training and certification compliance',
        items: { create: [
          { item: 'All certs current', order: 0, isCritical: true },
          { item: 'New hire training complete', order: 1 },
          { item: 'Annual refresh done', order: 2 },
          { item: 'Training records on file', order: 3 },
          { item: 'Manager certifications', order: 4 }
        ]}
      }
    })
  ]);

  complianceChecklists.push(...moreComplianceChecklists);

  console.log('Created 15 compliance checklists');

  // Create operational checklists (8+)
  await Promise.all([
    prisma.operationalChecklist.create({ data: { name: 'Opening Checklist', category: 'Daily Operations', frequency: 'daily', description: 'Morning opening tasks', items: { create: [
      { item: 'Turn on equipment', order: 0 },
      { item: 'Check food temps', order: 1 },
      { item: 'Verify cash drawer', order: 2 },
      { item: 'Review specials', order: 3 },
      { item: 'Brief staff', order: 4 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Closing Checklist', category: 'Daily Operations', frequency: 'daily', description: 'End of day tasks', items: { create: [
      { item: 'Balance register', order: 0 },
      { item: 'Clean equipment', order: 1 },
      { item: 'Stock for tomorrow', order: 2 },
      { item: 'Complete waste log', order: 3 },
      { item: 'Secure premises', order: 4 },
      { item: 'Set alarm', order: 5 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Mid-Day Check', category: 'Daily Operations', frequency: 'daily', description: 'Afternoon walkthrough', items: { create: [
      { item: 'Restock stations', order: 0 },
      { item: 'Check restrooms', order: 1 },
      { item: 'Sweep dining area', order: 2 },
      { item: 'Review sales pace', order: 3 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Weekly Inventory', category: 'Inventory', frequency: 'weekly', description: 'Weekly stock count', items: { create: [
      { item: 'Count proteins', order: 0 },
      { item: 'Count produce', order: 1 },
      { item: 'Count paper goods', order: 2 },
      { item: 'Count beverages', order: 3 },
      { item: 'Submit order', order: 4 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Food Safety Check', category: 'Safety', frequency: 'daily', description: 'Temperature monitoring', items: { create: [
      { item: 'Walk-in cooler temp', order: 0 },
      { item: 'Freezer temp', order: 1 },
      { item: 'Hot holding temps', order: 2 },
      { item: 'Prep station temps', order: 3 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Deep Cleaning', category: 'Cleaning', frequency: 'weekly', description: 'Weekly deep clean tasks', items: { create: [
      { item: 'Clean hood vents', order: 0 },
      { item: 'Degrease equipment', order: 1 },
      { item: 'Clean drains', order: 2 },
      { item: 'Wash floor mats', order: 3 },
      { item: 'Clean light fixtures', order: 4 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Monthly Maintenance', category: 'Maintenance', frequency: 'monthly', description: 'Monthly equipment maintenance', items: { create: [
      { item: 'Clean ice machine', order: 0 },
      { item: 'Change fryer oil', order: 1 },
      { item: 'Calibrate thermometers', order: 2 },
      { item: 'Check fire extinguisher', order: 3 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Staff Shift Change', category: 'Daily Operations', frequency: 'daily', description: 'Shift handover process', items: { create: [
      { item: 'Count drawer together', order: 0 },
      { item: 'Review pending orders', order: 1 },
      { item: 'Note any issues', order: 2 },
      { item: 'Sign handover log', order: 3 }
    ]}}})
  ]);

  // Additional operational checklists to reach 15+
  await Promise.all([
    prisma.operationalChecklist.create({ data: { name: 'Rush Hour Prep', category: 'Daily Operations', frequency: 'daily', description: 'Pre-rush preparation tasks', items: { create: [
      { item: 'Extra patties prepped', order: 0 },
      { item: 'Backup fries ready', order: 1 },
      { item: 'Drive-thru lane clear', order: 2 },
      { item: 'All registers staffed', order: 3 },
      { item: 'Drinks fully stocked', order: 4 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Delivery Order Check', category: 'Daily Operations', frequency: 'daily', description: 'Verify delivery orders before dispatch', items: { create: [
      { item: 'Order accuracy verified', order: 0 },
      { item: 'Items properly packaged', order: 1 },
      { item: 'Utensils and napkins', order: 2 },
      { item: 'Order sealed', order: 3 },
      { item: 'Driver notified', order: 4 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Weekly Safety Walk', category: 'Safety', frequency: 'weekly', description: 'Weekly safety inspection', items: { create: [
      { item: 'Floor mats secure', order: 0 },
      { item: 'Wet floor signs available', order: 1 },
      { item: 'First aid kit stocked', order: 2 },
      { item: 'Fire extinguisher check', order: 3 },
      { item: 'Emergency exits clear', order: 4 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Restroom Check', category: 'Cleaning', frequency: 'daily', description: 'Hourly restroom maintenance', items: { create: [
      { item: 'Paper towels stocked', order: 0 },
      { item: 'Soap dispensers full', order: 1 },
      { item: 'Floors clean and dry', order: 2 },
      { item: 'Trash emptied', order: 3 },
      { item: 'Mirrors clean', order: 4 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Cash Drop Procedure', category: 'Finance', frequency: 'daily', description: 'Mid-day cash drop process', items: { create: [
      { item: 'Count excess cash', order: 0 },
      { item: 'Fill out deposit slip', order: 1 },
      { item: 'Place in safe', order: 2 },
      { item: 'Log in register', order: 3 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Weekly Equipment Check', category: 'Maintenance', frequency: 'weekly', description: 'Weekly equipment inspection', items: { create: [
      { item: 'Clean grill plates', order: 0 },
      { item: 'Check fryer oil quality', order: 1 },
      { item: 'Test all burners', order: 2 },
      { item: 'Inspect walk-in seals', order: 3 },
      { item: 'Check dishwasher temps', order: 4 }
    ]}}}),
    prisma.operationalChecklist.create({ data: { name: 'Monthly P&L Review', category: 'Finance', frequency: 'monthly', description: 'Monthly financial review tasks', items: { create: [
      { item: 'Review labor costs', order: 0 },
      { item: 'Check food cost %', order: 1 },
      { item: 'Analyze waste report', order: 2 },
      { item: 'Compare to budget', order: 3 },
      { item: 'Create action plan', order: 4 }
    ]}}})
  ]);

  console.log('Created 15 operational checklists');

  // Create SOPs (16+)
  await Promise.all([
    prisma.sOP.create({ data: { title: 'Cash Handling Procedures', category: 'Finance', content: '1. Count drawer at start\n2. Document starting amount\n3. Process transactions\n4. Count at end of shift\n5. Complete deposit\n6. Secure in safe\n7. Report discrepancies', version: '2.0' } }),
    prisma.sOP.create({ data: { title: 'Food Safety Procedures', category: 'Safety', content: '1. Check temps every 2 hours\n2. Log all checks\n3. Discard unsafe food\n4. Follow FIFO\n5. Handwash every 30 min\n6. Separate cutting boards', version: '2.0' } }),
    prisma.sOP.create({ data: { title: 'Customer Complaint Handling', category: 'Service', content: '1. Listen actively\n2. Apologize sincerely\n3. Take ownership\n4. Offer solution\n5. Follow up\n6. Document\n7. Escalate if needed', version: '1.5' } }),
    prisma.sOP.create({ data: { title: 'Emergency Procedures', category: 'Safety', content: '1. Know exit locations\n2. Know extinguisher locations\n3. Fire: evacuate, call 911\n4. Injury: first aid, call 911\n5. Document incidents\n6. Report within 24 hours', version: '1.5' } }),
    prisma.sOP.create({ data: { title: 'Opening Procedures', category: 'Operations', content: '1. Unlock and disarm\n2. Turn on equipment\n3. Check temps\n4. Count drawer\n5. Review prep list\n6. Brief team\n7. Unlock doors at open time', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'Closing Procedures', category: 'Operations', content: '1. Lock doors\n2. Complete cleaning\n3. Turn off equipment\n4. Balance drawer\n5. Complete deposit\n6. Arm alarm\n7. Lock up', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'Inventory Receiving', category: 'Operations', content: '1. Check delivery invoice\n2. Inspect for damage\n3. Check temps\n4. Verify quantities\n5. Sign receipt\n6. Store properly\n7. Update inventory system', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'Waste Management', category: 'Operations', content: '1. Separate recyclables\n2. Log all waste\n3. Empty bins regularly\n4. Clean area after\n5. Report excessive waste\n6. Review weekly', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'New Employee Onboarding', category: 'HR', content: '1. Complete paperwork\n2. Assign locker\n3. Issue uniform\n4. Complete training\n5. Shadow experienced staff\n6. First week check-in\n7. 30-day review', version: '1.5' } }),
    prisma.sOP.create({ data: { title: 'Performance Review Process', category: 'HR', content: '1. Schedule meeting\n2. Review metrics\n3. Gather feedback\n4. Prepare documentation\n5. Conduct review\n6. Set goals\n7. Follow up', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'Equipment Breakdown', category: 'Maintenance', content: '1. Stop using equipment\n2. Note the issue\n3. Call approved vendor\n4. Document work order\n5. Implement workaround\n6. Follow up on repair\n7. Test before use', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'Delivery Order Handling', category: 'Operations', content: '1. Confirm order\n2. Prepare food\n3. Package properly\n4. Label clearly\n5. Verify with driver\n6. Log pickup time\n7. Handle issues promptly', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'Catering Orders', category: 'Operations', content: '1. Confirm details 24hr ahead\n2. Prep food\n3. Package for transport\n4. Load carefully\n5. Deliver on time\n6. Set up if required\n7. Collect payment', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'Social Media Response', category: 'Marketing', content: '1. Monitor mentions daily\n2. Respond within 24 hours\n3. Be professional\n4. Thank for compliments\n5. Address concerns privately\n6. Escalate serious issues\n7. Document responses', version: '1.0' } }),
    prisma.sOP.create({ data: { title: 'Allergen Handling', category: 'Safety', content: '1. Ask about allergies\n2. Note on order\n3. Alert kitchen\n4. Use clean equipment\n5. Verify ingredients\n6. Deliver separately\n7. Confirm with customer', version: '1.5' } }),
    prisma.sOP.create({ data: { title: 'Power Outage Procedures', category: 'Safety', content: '1. Check generator\n2. Monitor food temps\n3. Close if extended\n4. Discard compromised food\n5. Document losses\n6. Report to corporate\n7. Reopen when safe', version: '1.0' } })
  ]);

  console.log('Created 16 SOPs');

  // Create best practices (15+)
  await Promise.all([
    prisma.bestPractice.create({ data: { title: 'Morning Team Huddle', category: 'Operations', description: '5-minute daily huddle to review goals and address concerns', impact: 'Reduced errors by 15%, improved morale', implementedBy: 'NYC-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Customer Loyalty Program', category: 'Marketing', description: 'Simple punch card for free item after 10 purchases', impact: 'Increased repeat customers by 25%', implementedBy: 'MIA-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Cross-Training Initiative', category: 'HR', description: 'Train all employees on at least 2 positions', impact: 'Reduced overtime by 20%', implementedBy: 'CHI-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Digital Prep Lists', category: 'Operations', description: 'Use tablet for prep lists with real-time updates', impact: 'Reduced waste by 12%', implementedBy: 'SFO-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Customer Feedback Kiosk', category: 'Service', description: 'Quick survey on tablet at exit', impact: 'Improved satisfaction scores 10%', implementedBy: 'AUS-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Shift Lead Rotation', category: 'HR', description: 'Rotate shift lead duties to develop staff', impact: 'Improved promotion pipeline', implementedBy: 'BOS-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Slow Period Training', category: 'Operations', description: 'Use slow periods for training sessions', impact: 'Better prepared staff without overtime', implementedBy: 'DEN-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Local Community Events', category: 'Marketing', description: 'Participate in local events and sponsor teams', impact: 'Increased local awareness 30%', implementedBy: 'SEA-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Waste Tracking System', category: 'Operations', description: 'Detailed waste logging to identify patterns', impact: 'Reduced food cost 2%', implementedBy: 'LAX-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Peak Hour Prep', category: 'Operations', description: 'Extra prep 30 min before predicted rush', impact: 'Faster service during peak', implementedBy: 'PHX-001', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Birthday Recognition', category: 'HR', description: 'Recognize employee birthdays with small celebration', impact: 'Improved retention', implementedBy: 'NYC-002', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Visual Station Guides', category: 'Operations', description: 'Laminated quick-reference cards at each station', impact: 'Faster new hire ramp-up', implementedBy: 'CHI-002', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Daily Sales Competition', category: 'Service', description: 'Friendly upselling competition with small prizes', impact: 'Increased average ticket 8%', implementedBy: 'MIA-002', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Pre-shift Stretch', category: 'Safety', description: '2-minute group stretch before shift', impact: 'Reduced strain injuries', implementedBy: 'SFO-002', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Customer Name Usage', category: 'Service', description: 'Use customer name from payment when calling order', impact: 'Higher satisfaction scores', implementedBy: 'AUS-002', isApproved: true } }),
    prisma.bestPractice.create({ data: { title: 'Weekly Menu Meeting', category: 'Operations', description: 'Staff meeting to discuss menu knowledge', impact: 'Better product recommendations', implementedBy: 'BOS-002', isApproved: false } })
  ]);

  console.log('Created 16 best practices');

  // Create financial data for locations (12 months for each)
  for (const location of locations) {
    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const date = new Date();
      date.setMonth(date.getMonth() - monthOffset);
      date.setDate(1);

      const baseRevenue = 75000 + Math.random() * 50000;
      const cogs = baseRevenue * (0.27 + Math.random() * 0.05);
      const laborCost = baseRevenue * (0.24 + Math.random() * 0.04);
      const operatingExpenses = baseRevenue * (0.14 + Math.random() * 0.03);
      const netProfit = baseRevenue - cogs - laborCost - operatingExpenses;
      const royaltyDue = baseRevenue * 0.05;

      await prisma.financialData.create({
        data: {
          locationId: location.id,
          period: date,
          revenue: parseFloat(baseRevenue.toFixed(2)),
          cogs: parseFloat(cogs.toFixed(2)),
          laborCost: parseFloat(laborCost.toFixed(2)),
          operatingExpenses: parseFloat(operatingExpenses.toFixed(2)),
          netProfit: parseFloat(netProfit.toFixed(2)),
          royaltyDue: parseFloat(royaltyDue.toFixed(2)),
          royaltyPaid: monthOffset > 0 ? parseFloat(royaltyDue.toFixed(2)) : 0
        }
      });
    }
  }

  console.log('Created 12 months financial data per location');

  // Create royalty payments (at least 15+ records with variety)
  const royaltyPayments = [];

  // Create records for 20 locations across multiple months with various statuses
  const statusDistribution = [
    // Current month - all pending (4 records)
    { monthsAgo: 0, status: 'PENDING', count: 4 },
    // Last month - mix of pending and paid (4 records)
    { monthsAgo: 1, status: 'PENDING', count: 2 },
    { monthsAgo: 1, status: 'PAID', count: 2 },
    // 2 months ago - mix of all statuses (6 records)
    { monthsAgo: 2, status: 'OVERDUE', count: 2 },
    { monthsAgo: 2, status: 'PARTIAL', count: 2 },
    { monthsAgo: 2, status: 'PAID', count: 2 },
    // 3 months ago - mostly paid with some overdue (4 records)
    { monthsAgo: 3, status: 'PAID', count: 3 },
    { monthsAgo: 3, status: 'OVERDUE', count: 1 },
    // 4+ months ago - all paid (4 records)
    { monthsAgo: 4, status: 'PAID', count: 2 },
    { monthsAgo: 5, status: 'PAID', count: 2 }
  ];

  let locationIdx = 0;
  for (const dist of statusDistribution) {
    for (let i = 0; i < dist.count; i++) {
      const location = locations[locationIdx % locations.length];
      locationIdx++;

      const period = new Date();
      period.setMonth(period.getMonth() - dist.monthsAgo);
      period.setDate(1);
      period.setHours(0, 0, 0, 0);

      // Calculate royalty based on approximate revenue (5% royalty rate)
      const baseRevenue = 75000 + Math.random() * 50000;
      const amountDue = parseFloat((baseRevenue * 0.05).toFixed(2));

      let amountPaid = 0;
      let paidDate = null;

      if (dist.status === 'PAID') {
        amountPaid = amountDue;
        paidDate = new Date(period);
        paidDate.setDate(10 + Math.floor(Math.random() * 10));
      } else if (dist.status === 'PARTIAL') {
        amountPaid = parseFloat((amountDue * (0.3 + Math.random() * 0.4)).toFixed(2));
      }

      royaltyPayments.push({
        locationId: location.id,
        period: period,
        amountDue: amountDue,
        amountPaid: amountPaid,
        paidDate: paidDate,
        status: dist.status
      });
    }
  }

  await prisma.royaltyPayment.createMany({ data: royaltyPayments });
  console.log('Created ' + royaltyPayments.length + ' royalty payments');

  // Create performance data (60 days per location)
  for (const location of locations) {
    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() - dayOffset);
      date.setHours(0, 0, 0, 0);

      const salesAmount = 2000 + Math.random() * 2000;
      const transactionCount = Math.floor(70 + Math.random() * 50);
      const customerCount = Math.floor(transactionCount * (1.1 + Math.random() * 0.2));
      const laborHours = 35 + Math.random() * 25;
      const customerSatisfaction = 3.5 + Math.random() * 1.5;

      await prisma.performanceData.create({
        data: {
          locationId: location.id,
          date,
          salesAmount: parseFloat(salesAmount.toFixed(2)),
          transactionCount,
          averageTicket: parseFloat((salesAmount / transactionCount).toFixed(2)),
          customerCount,
          laborHours: parseFloat(laborHours.toFixed(1)),
          customerSatisfaction: parseFloat(customerSatisfaction.toFixed(1))
        }
      });
    }
  }

  console.log('Created 60 days performance data per location');

  // Create compliance audits (15+)
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i];
    // Past audit
    await prisma.complianceAudit.create({
      data: {
        locationId: location.id,
        checklistId: complianceChecklists[i % complianceChecklists.length].id,
        scheduledDate: new Date(Date.now() - (30 + i * 3) * 24 * 60 * 60 * 1000),
        completedDate: new Date(Date.now() - (28 + i * 3) * 24 * 60 * 60 * 1000),
        auditor: 'Corporate Auditor',
        score: 80 + Math.random() * 20,
        status: 'COMPLETED',
        findings: 'Audit completed. Minor improvements needed.'
      }
    });

    // Upcoming audit
    await prisma.complianceAudit.create({
      data: {
        locationId: location.id,
        checklistId: complianceChecklists[(i + 1) % complianceChecklists.length].id,
        scheduledDate: new Date(Date.now() + (14 + i * 2) * 24 * 60 * 60 * 1000),
        auditor: 'Regional Manager',
        status: 'SCHEDULED'
      }
    });
  }

  console.log('Created 40 compliance audits');

  // Create announcements (15+)
  const announcementData = [
    { title: 'New Menu Items Launching Next Month', content: 'We are excited to announce new seasonal menu items. Training materials available next week.', priority: 'HIGH' },
    { title: 'Updated Health and Safety Guidelines', content: 'Please review updated health and safety guidelines. All managers acknowledge by end of week.', priority: 'CRITICAL' },
    { title: 'Q4 Performance Goals', content: 'Our Q4 goals have been set. Focus on customer satisfaction and average ticket growth.', priority: 'MEDIUM' },
    { title: 'Holiday Schedule Reminder', content: 'Please submit holiday schedule requests by the 15th. Early planning helps ensure coverage.', priority: 'MEDIUM' },
    { title: 'New POS System Features', content: 'New POS features rolling out next week. Training videos available in the portal.', priority: 'MEDIUM' },
    { title: 'Employee of the Month Program', content: 'We are launching an Employee of the Month program. Nominations open now!', priority: 'LOW' },
    { title: 'Supply Chain Update', content: 'Some supply items may be delayed. Check alternative vendor list if needed.', priority: 'HIGH' },
    { title: 'New Delivery Partnership', content: 'We have partnered with a new delivery service. Training on new tablets required.', priority: 'HIGH' },
    { title: 'Annual Review Schedule', content: 'Annual performance reviews scheduled for next month. Prepare documentation.', priority: 'MEDIUM' },
    { title: 'Summer Promotion Launch', content: 'Summer promotion launching June 1st. Marketing materials shipping this week.', priority: 'MEDIUM' },
    { title: 'Uniform Update', content: 'New uniform options available. Order through the portal with your location code.', priority: 'LOW' },
    { title: 'Training Certification Deadline', content: 'All food safety certifications must be renewed by end of month.', priority: 'CRITICAL' },
    { title: 'Customer Feedback Initiative', content: 'New customer feedback program launching. Ask customers to complete survey.', priority: 'MEDIUM' },
    { title: 'Energy Saving Initiative', content: 'New guidelines for energy conservation. Turn off equipment during slow periods.', priority: 'LOW' },
    { title: 'Regional Meeting Schedule', content: 'Quarterly regional meetings scheduled. Check calendar for your region date.', priority: 'MEDIUM' },
    { title: 'New Vendor Onboarding', content: 'New cleaning supply vendor approved. Transition details in attached document.', priority: 'LOW' }
  ];

  for (let i = 0; i < announcementData.length; i++) {
    const ann = announcementData[i];
    await prisma.announcement.create({
      data: {
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        authorId: corporateUsers[i % corporateUsers.length].id,
        targetRoles: [],
        isPublished: true,
        publishedAt: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000)
      }
    });
  }

  console.log('Created 16 announcements');

  // Create knowledge articles (16+)
  const articleData = [
    { title: 'How to Process Refunds', category: 'Operations', content: 'Step-by-step guide to processing refunds through the POS system...', tags: ['refund', 'POS'] },
    { title: 'Equipment Troubleshooting Guide', category: 'Maintenance', content: 'Common equipment issues and solutions for grill, fryer, and POS...', tags: ['equipment', 'troubleshooting'] },
    { title: 'Inventory Management Best Practices', category: 'Operations', content: 'Effective inventory management: count weekly, use FIFO, set par levels...', tags: ['inventory', 'management'] },
    { title: 'Customer Service FAQ', category: 'Service', content: 'Answers to common customer questions and how to handle them...', tags: ['customer', 'FAQ'] },
    { title: 'Allergen Information Guide', category: 'Safety', content: 'Complete allergen information for all menu items...', tags: ['allergen', 'safety'] },
    { title: 'Opening Manager Duties', category: 'Operations', content: 'Complete guide for opening managers including all required tasks...', tags: ['opening', 'manager'] },
    { title: 'Closing Manager Duties', category: 'Operations', content: 'Complete guide for closing managers including all required tasks...', tags: ['closing', 'manager'] },
    { title: 'Cash Handling FAQ', category: 'Finance', content: 'Common questions about cash handling and till management...', tags: ['cash', 'finance'] },
    { title: 'Emergency Contact List', category: 'Safety', content: 'Emergency contacts for all situations: fire, medical, security, corporate...', tags: ['emergency', 'contacts'] },
    { title: 'Menu Item Modifications', category: 'Operations', content: 'Guide to common menu modifications and how to ring them up...', tags: ['menu', 'modifications'] },
    { title: 'Delivery Order Guidelines', category: 'Operations', content: 'Best practices for packaging and handling delivery orders...', tags: ['delivery', 'packaging'] },
    { title: 'Staff Scheduling Guide', category: 'Management', content: 'How to create effective schedules that meet labor targets...', tags: ['scheduling', 'management'] },
    { title: 'Training New Employees', category: 'HR', content: 'Checklist and guide for training new team members...', tags: ['training', 'onboarding'] },
    { title: 'Food Waste Reduction Tips', category: 'Operations', content: 'Strategies to reduce food waste and improve profitability...', tags: ['waste', 'efficiency'] },
    { title: 'Social Media Guidelines', category: 'Marketing', content: 'Approved hashtags, response templates, and best practices...', tags: ['social media', 'marketing'] },
    { title: 'Local Store Marketing', category: 'Marketing', content: 'Ideas for local marketing initiatives and community involvement...', tags: ['marketing', 'local'] }
  ];

  for (let i = 0; i < articleData.length; i++) {
    const art = articleData[i];
    await prisma.knowledgeArticle.create({
      data: {
        title: art.title,
        category: art.category,
        content: art.content,
        tags: art.tags,
        authorId: corporateUsers[i % corporateUsers.length].id,
        views: Math.floor(Math.random() * 500)
      }
    });
  }

  console.log('Created 16 knowledge articles');

  // Create support tickets (18+)
  const ticketData = [
    { subject: 'POS System Freezing', description: 'POS freezes during peak hours causing delays.', category: 'Technical', priority: 'HIGH', status: 'IN_PROGRESS' },
    { subject: 'Need Marketing Materials', description: 'Request for additional banners for local event.', category: 'Marketing', priority: 'MEDIUM', status: 'OPEN' },
    { subject: 'Equipment Repair Request', description: 'Grill not maintaining proper temperature.', category: 'Maintenance', priority: 'HIGH', status: 'IN_PROGRESS' },
    { subject: 'New Employee Setup', description: 'Need POS access for new hire starting Monday.', category: 'HR', priority: 'MEDIUM', status: 'OPEN' },
    { subject: 'Inventory Discrepancy', description: 'Significant variance in last inventory count.', category: 'Operations', priority: 'MEDIUM', status: 'OPEN' },
    { subject: 'Vendor Billing Issue', description: 'Overcharged on last food delivery.', category: 'Finance', priority: 'LOW', status: 'RESOLVED' },
    { subject: 'Training Access Problem', description: 'Cannot access training portal for new certification.', category: 'Technical', priority: 'MEDIUM', status: 'OPEN' },
    { subject: 'Menu Board Replacement', description: 'Digital menu board not displaying correctly.', category: 'Maintenance', priority: 'MEDIUM', status: 'IN_PROGRESS' },
    { subject: 'Uniform Order Delay', description: 'Uniforms ordered 3 weeks ago not arrived.', category: 'Operations', priority: 'LOW', status: 'OPEN' },
    { subject: 'Scheduling System Issue', description: 'Unable to post schedule for next week.', category: 'Technical', priority: 'HIGH', status: 'RESOLVED' },
    { subject: 'Customer Complaint Follow-up', description: 'Need guidance on compensation for complaint.', category: 'Service', priority: 'MEDIUM', status: 'OPEN' },
    { subject: 'Pest Control Request', description: 'Need pest control service scheduled.', category: 'Maintenance', priority: 'HIGH', status: 'IN_PROGRESS' },
    { subject: 'HVAC Not Cooling', description: 'AC not working properly, store is hot.', category: 'Maintenance', priority: 'CRITICAL', status: 'IN_PROGRESS' },
    { subject: 'New Vendor Setup', description: 'Need new local produce vendor approved.', category: 'Operations', priority: 'LOW', status: 'OPEN' },
    { subject: 'Payroll Discrepancy', description: 'Employee reported missing hours on last check.', category: 'HR', priority: 'HIGH', status: 'RESOLVED' },
    { subject: 'License Renewal Help', description: 'Need guidance on renewing business license.', category: 'Compliance', priority: 'MEDIUM', status: 'OPEN' },
    { subject: 'Security Camera Issue', description: 'Camera 3 in parking lot not working.', category: 'Security', priority: 'MEDIUM', status: 'OPEN' },
    { subject: 'WiFi Connectivity Problem', description: 'Guest WiFi down, affecting customer experience.', category: 'Technical', priority: 'MEDIUM', status: 'IN_PROGRESS' }
  ];

  for (let i = 0; i < ticketData.length; i++) {
    const ticket = ticketData[i];
    await prisma.supportTicket.create({
      data: {
        ticketNumber: `TKT-${String(i + 1).padStart(6, '0')}`,
        submitterId: locationManagers[i % locationManagers.length].id,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: ticket.status === 'IN_PROGRESS' ? 'Support Team' : null
      }
    });
  }

  console.log('Created 18 support tickets');

  // Create issue reports (16+)
  const issueData = [
    { title: 'AC Not Cooling Properly', description: 'Main dining area AC not maintaining temperature.', category: 'Maintenance', priority: 'HIGH', status: 'IN_PROGRESS' },
    { title: 'Parking Lot Light Out', description: 'Northeast corner light out for 3 days.', category: 'Safety', priority: 'MEDIUM', status: 'OPEN' },
    { title: 'Broken Table', description: 'Table 5 wobbles, needs repair or replacement.', category: 'Maintenance', priority: 'LOW', status: 'OPEN' },
    { title: 'Restroom Faucet Leaking', description: 'Mens restroom faucet has constant drip.', category: 'Maintenance', priority: 'MEDIUM', status: 'RESOLVED' },
    { title: 'Outdoor Sign Flickering', description: 'Main outdoor sign flickers at night.', category: 'Maintenance', priority: 'MEDIUM', status: 'IN_PROGRESS' },
    { title: 'Walk-in Cooler Issue', description: 'Walk-in temp fluctuating between 38-44°F.', category: 'Equipment', priority: 'CRITICAL', status: 'IN_PROGRESS' },
    { title: 'Broken Window Seal', description: 'Front window seal damaged, drafty.', category: 'Maintenance', priority: 'LOW', status: 'OPEN' },
    { title: 'Floor Tile Cracked', description: 'Cracked tile near entrance, tripping hazard.', category: 'Safety', priority: 'HIGH', status: 'OPEN' },
    { title: 'Drive-thru Speaker', description: 'Drive-thru speaker has static, hard to hear.', category: 'Equipment', priority: 'HIGH', status: 'IN_PROGRESS' },
    { title: 'Grease Trap Full', description: 'Grease trap needs servicing.', category: 'Maintenance', priority: 'MEDIUM', status: 'OPEN' },
    { title: 'Pest Sighting', description: 'Saw roach in storage area.', category: 'Safety', priority: 'CRITICAL', status: 'IN_PROGRESS' },
    { title: 'Door Lock Sticking', description: 'Back door lock difficult to open.', category: 'Security', priority: 'MEDIUM', status: 'OPEN' },
    { title: 'Fryer Temperature Issue', description: 'Fryer 2 not maintaining temp, needs calibration.', category: 'Equipment', priority: 'HIGH', status: 'RESOLVED' },
    { title: 'Pothole in Parking Lot', description: 'Large pothole near handicap spots.', category: 'Safety', priority: 'HIGH', status: 'OPEN' },
    { title: 'Hood Vent Noise', description: 'Kitchen hood vent making loud noise.', category: 'Equipment', priority: 'MEDIUM', status: 'OPEN' },
    { title: 'Exterior Paint Peeling', description: 'Paint peeling on west-facing wall.', category: 'Maintenance', priority: 'LOW', status: 'OPEN' }
  ];

  for (let i = 0; i < issueData.length; i++) {
    const issue = issueData[i];
    await prisma.issueReport.create({
      data: {
        locationId: locations[i % locations.length].id,
        reportedBy: locationManagers[i % locationManagers.length].id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        status: issue.status
      }
    });
  }

  console.log('Created 16 issue reports');

  // Create internal messages (20+ with diverse senders/receivers)
  const messageData = [
    // Messages TO admin user
    { senderId: corporateUsers[0].id, receiverId: adminUser.id, subject: 'Monthly report ready for review', content: 'Hi Admin,\n\nThe monthly performance report is ready for your review. All locations are performing above expectations this quarter.\n\nPlease let me know if you need any additional details.\n\nBest regards', isRead: false },
    { senderId: corporateUsers[1].id, receiverId: adminUser.id, subject: 'New vendor approval request', content: 'Hello,\n\nWe have a new vendor application for review. They specialize in organic produce and have competitive pricing.\n\nCan you review and approve when you have a chance?\n\nThanks!', isRead: false },
    { senderId: regionalManagers[0].id, receiverId: adminUser.id, subject: 'East region update', content: 'Hi,\n\nQuick update on the East region: All locations passed their compliance audits this month. Customer satisfaction scores are up 5%.\n\nLet me know if you need more details.', isRead: true },
    { senderId: locationManagers[0].id, receiverId: adminUser.id, subject: 'Thank you for the visit', content: 'Hi,\n\nThank you for visiting our location yesterday. The team really appreciated your feedback and encouragement.\n\nWe will implement your suggestions right away.\n\nBest regards', isRead: true },

    // Messages FROM admin user
    { senderId: adminUser.id, receiverId: corporateUsers[0].id, subject: 'Re: Monthly report ready for review', content: 'Thanks for the update. The numbers look great!\n\nPlease schedule a call for Thursday to discuss expansion plans.', isRead: true },
    { senderId: adminUser.id, receiverId: regionalManagers[1].id, subject: 'West region priorities', content: 'Hi Lisa,\n\nPlease focus on the following priorities for Q1:\n1. Improve delivery times\n2. Reduce food waste by 10%\n3. Staff training completion\n\nLet me know if you need resources.', isRead: true },

    // Messages TO/FROM corporate users
    { senderId: locationManagers[1].id, receiverId: corporateUsers[0].id, subject: 'Equipment purchase request', content: 'Hi,\n\nOur main grill needs to be replaced. Can you approve an emergency equipment purchase?\n\nI have attached the quote from our approved vendor.', isRead: false },
    { senderId: locationManagers[2].id, receiverId: corporateUsers[1].id, subject: 'Marketing materials needed', content: 'Hello Sarah,\n\nWe are running low on marketing materials for our upcoming promotion. Can you send us more banners and table tents?\n\nThanks!', isRead: true },
    { senderId: corporateUsers[0].id, receiverId: locationManagers[3].id, subject: 'Great customer feedback!', content: 'Hi,\n\nI wanted to share some positive feedback we received about your location. A customer praised your team\'s exceptional service.\n\nKeep up the great work!', isRead: true },
    { senderId: corporateUsers[2].id, receiverId: regionalManagers[2].id, subject: 'Quarterly review meeting', content: 'Hi Robert,\n\nPlease prepare for the quarterly review meeting next week. We will discuss:\n- Performance metrics\n- Staff development\n- Expansion opportunities\n\nThanks!', isRead: false },

    // Messages between regional managers
    { senderId: regionalManagers[0].id, receiverId: regionalManagers[1].id, subject: 'Best practices sharing', content: 'Hi Lisa,\n\nOur East region locations have been using a new prep schedule that has reduced waste by 15%. Would you like me to share the details?\n\nRegards,\nJames', isRead: true },
    { senderId: regionalManagers[3].id, receiverId: regionalManagers[0].id, subject: 'Staff exchange program idea', content: 'Hi James,\n\nI have an idea for a staff exchange program between regions. It could help with training and morale.\n\nWhat do you think?\n\nMaria', isRead: false },

    // Messages between location managers
    { senderId: locationManagers[4].id, receiverId: locationManagers[5].id, subject: 'Can you cover Saturday?', content: 'Hey,\n\nI have a family event on Saturday. Would you be able to cover my shift? I can return the favor next month.\n\nThanks!', isRead: true },
    { senderId: locationManagers[6].id, receiverId: locationManagers[7].id, subject: 'New POS tip', content: 'Hey! I found a shortcut on the POS for split payments. Press F7 twice and it brings up the split menu. Saves a lot of time during rush!', isRead: true },
    { senderId: locationManagers[8].id, receiverId: locationManagers[9].id, subject: 'Inventory question', content: 'Hi,\n\nDo you know the par level for tomatoes? The system shows 50 cases but that seems high for our volume.\n\nThanks!', isRead: false },
    { senderId: locationManagers[10].id, receiverId: locationManagers[11].id, subject: 'Great team meeting format', content: 'I tried your team meeting format and it worked great! The staff really engaged with the recognition segment.\n\nThanks for sharing!', isRead: true },

    // More messages to ensure variety
    { senderId: locationManagers[12].id, receiverId: corporateUsers[0].id, subject: 'Compliance audit preparation', content: 'Hi,\n\nOur compliance audit is scheduled for next week. Is there anything specific we should prepare?\n\nThanks!', isRead: true },
    { senderId: corporateUsers[1].id, receiverId: locationManagers[13].id, subject: 'Training completion reminder', content: 'Hi,\n\nThis is a friendly reminder that food safety training must be completed by end of month for all staff.\n\nPlease prioritize this.\n\nThanks!', isRead: false },
    { senderId: regionalManagers[1].id, receiverId: locationManagers[14].id, subject: 'Performance recognition', content: 'Congratulations!\n\nYour location had the highest customer satisfaction scores in the region this month. Great job!\n\nKeep up the excellent work!', isRead: true },
    { senderId: locationManagers[0].id, receiverId: regionalManagers[0].id, subject: 'New hire update', content: 'Hi James,\n\nJust wanted to update you that our new hire is doing great. She completed training ahead of schedule and is already working independently.\n\nThanks!', isRead: true }
  ];

  for (const msg of messageData) {
    await prisma.message.create({
      data: {
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        subject: msg.subject,
        content: msg.content,
        isRead: msg.isRead
      }
    });
  }

  console.log('Created ' + messageData.length + ' messages');

  // Create system settings
  await Promise.all([
    prisma.systemSetting.create({ data: { key: 'royalty_rate', value: '0.05', description: 'Royalty rate as decimal' } }),
    prisma.systemSetting.create({ data: { key: 'support_email', value: 'support@franchise.com', description: 'Support email address' } }),
    prisma.systemSetting.create({ data: { key: 'support_phone', value: '1-800-555-HELP', description: 'Support phone number' } }),
    prisma.systemSetting.create({ data: { key: 'company_name', value: 'Franchise Co.', description: 'Company display name' } }),
    prisma.systemSetting.create({ data: { key: 'audit_frequency', value: 'monthly', description: 'Default audit frequency' } }),
    prisma.systemSetting.create({ data: { key: 'default_currency', value: 'USD', description: 'Default currency' } })
  ]);

  console.log('Created system settings');

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================');
  console.log('\nDefault login credentials:');
  console.log(`  Admin: admin@franchise.com / ${adminPassword}`);
  console.log(`  Corporate: corporate@franchise.com / ${corporatePassword}`);
  console.log(`  Manager: manager@nyc-001.franchise.com / ${managerPassword}`);
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
