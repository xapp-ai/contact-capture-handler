/*! Copyright (c) 2026, XAPP AI */

/**
 * CostGuide / Contractor Appointments trade taxonomy -- the accepted values for the `Trade`
 * field on their booking widget and lead post.
 *
 * Captured from `https://track.costguide.com/posting-instructions.html?c=58&type=Server` on
 * 2026-08-20. Deliberately a checked-in constant rather than a runtime fetch: that URL serves
 * an HTML page with no contract or versioning, so a markup change would become a live booking
 * outage. Re-capture it by hand when CostGuide say the list has moved, and bump
 * {@link COSTGUIDE_TRADE_LIST_CAPTURED} with it.
 *
 * Exported from the package so Studio renders its `allowedTrades` picker from this exact list
 * -- one source of truth, no drift between what an operator can pick and what classification
 * will accept.
 *
 * NOTE: the source URL is campaign-scoped (`c=58`). Whether the taxonomy is universal or varies
 * per campaign is an open question with CostGuide; if it varies, this constant becomes wrong and
 * the list has to move into config.
 */
export const COSTGUIDE_TRADES: readonly string[] = [
    "Bathroom - Bathtub Liner or Shower Enclosure",
    "Bathroom - Bathtub or Shower Updates",
    "Bathroom - Bathtub to Shower Conversion",
    "Bathroom - Remodel",
    "Bathroom - Walk-in Tub",
    "Batt Rolled or Reflective Insulation - Install or Upgrade",
    "Blown-In Insulation - Install or Upgrade",
    "Boiler or Radiator Heating System - Install or Replace",
    "Deck or Porch - Build or Replace",
    "Deck or Porch - Build or Replace- For Business",
    "Deck or Porch - Repair",
    "Doors - Exterior Door Install or Replace",
    "Doors - Interior Door Install or Replace",
    "Gutter - Cover",
    "Gutters - Install or Replace",
    "Gutters Repair - Service Call",
    "Mosquito Control",
    "Pest Control - Birds and Bats",
    "Pest Control - Birds and Bats - For Business",
    "Pest Control - Bugs and Insects",
    "Pest Control - Bugs and Insects - For Business",
    "Pest Control - Rodents",
    "Pest Control - Rodents - For Business",
    "Pest Control - Small Animals",
    "Pest Control - Small Animals - For Business",
    "Pest Control - Termite",
    "Pest Control - Termite - For Business",
    "Radiant Floor Heating System - Repair",
    "Roofing - Asphalt Install or Replace",
    "Roofing - Clay Tile Install or Replace",
    "Roofing - Commercial Install or Replace",
    "Roofing - Commercial Repair",
    "Roofing - Flat Install or Replace",
    "Roofing - Inspection",
    "Roofing - Metal Install or Replace",
    "Roofing - Repair",
    "Roofing - Wood Shingles Install or Replace",
    "Siding - Brick or Stone Install or Replace",
    "Siding - Cement Install or Replace",
    "Siding - Metal Install or Replace",
    "Siding - Repair",
    "Siding - Stucco Install or Replace",
    "Siding - Vinyl Install or Replace",
    "Siding - Wood Install or Replace",
    "Solar - Roofing",
    "Spray Foam Insulation - Install",
    "Windows - Glass Repair",
    "Windows - Replace 1 Window",
    "Windows - Replace 10+ Windows",
    "Windows - Replace 2 Windows",
    "Windows - Replace 3-5 Windows",
    "Windows - Replace 6-9 Windows",
    "Windows - Replace Storm Windows",
    "Windows Repair - Service Call",
    "Alarm or Security System - Install",
    "Home Automation System - Install or Service",
    "Alarm or Security System - Repair",
    "Exterior Home or Structure - Paint or Stain",
    "Concrete Floor Coating-Apply",
    "Sunroom or Patio Enclosure - Build",
    "Arbor Pergola or Trellis - Build Custom",
    "Gazebo or Freestanding Porch - Build or Install",
    "Pool Enclosure - Build",
    "Basement - Remodel",
    "Stone Slab Countertops - Install (Granite, Marble, Quartz, etc)",
    "Cabinets - Reface",
    "Cabinets - Install",
    "Custom Cabinets - Build",
    "Pre-Made Cabinets - Install",
    "Solar - Installation",
    "Cabinets - Refinish",
    "Laminate Countertops - Install",
    "Solid Surface Countertops - Install (Concrete, Stainless Steel, etc)",
    "Cabinets - Repair",
    "Stone Slab Countertops - Repair (Granite, Marble, Quartz, etc)",
    "Solid Surface Countertops - Repair (Concrete, Stainless Steel, etc)",
    "Laminate Countertops - Repair",
    "Wood Fence - Repair",
    "Vinyl or PVC Fence - Install",
    "Aluminum or Steel Fence - Install",
    "Wrought Iron Fence - Install",
    "Gate for Driveway or Security - Install or Replace",
    "Wood Fence - Repair - For Business",
    "Chain Link Fence - Install",
    "Chain Link Fence - Repair or Alter",
    "Wrought Iron Fence - Repair or Weld",
    "Vinyl or PVC Fence - Repair",
    "Aluminum or Steel Fence - Repair",
    "Barbed Wire Fence - Install",
    "Barbed Wire Fence - Repair",
    "Wood Flooring - Install or Replace",
    "Tile or Stone Flooring - Install or Replace",
    "Laminate Flooring - Install or Replace",
    "Vinyl or Linoleum Floor - Install or Replace",
    "Carpet - Install or Replace",
    "Wood Flooring - Refinish",
    "Flooring - Repair",
    "Handyman for Multiple Small Projects",
    "Home Warranty Program",
    "Home Maintenance Contract or Warranty Program",
    "Central A/C - Install",
    "Gas Furnace / Forced Air Heating System - Install",
    "Heat Pump - Install or Replace",
    "Electric Furnace / Forced Air Heating System - Install",
    "Oil Furnace / Forced Air Heating System - Install",
    "Furnace / Forced Air Heating System - Install or Replace",
    "Central A/C - Service or Repair",
    "Gas Furnace / Forced Air Heating System - Repair",
    "Heat Pump - Repair or Service",
    "Electric Furnace / Forced Air Heating System - Repair",
    "Oil Furnace / Forced Air Heating System - Repair",
    "Swamp Cooler - Service or Repair",
    "Swamp Cooler - Install or Replace",
    "Radiant Floor Heating System - Install",
    "Furnace / Forced Air Heating System - Repair or Service",
    "Boiler or Radiator Heating System - Repair or Service",
    "Kitchen - Remodel",
];

/** Date the {@link COSTGUIDE_TRADES} list above was captured from CostGuide. */
export const COSTGUIDE_TRADE_LIST_CAPTURED = "2026-08-20";

/** Case-insensitive lookup of the canonical trade string, or undefined when unknown. */
export function canonicalTrade(value: string | undefined): string | undefined {
    if (!value) {
        return undefined;
    }
    const needle = value.trim().toLowerCase();
    return COSTGUIDE_TRADES.find((trade) => trade.toLowerCase() === needle);
}
