import json
import sys
from datetime import datetime

class TicketParsingError(Exception):
    pass

def parse_price(price_str: str, title: str) -> float:
    if not isinstance(price_str, str):
        raise TicketParsingError(f"Price for '{title}' must be a string, got {type(price_str)}")
    if not price_str.strip().endswith("Euro"):
        raise TicketParsingError(f"Price for '{title}' must end with 'Euro', got '{price_str}'")
    
    # Remove "Euro" and whitespace
    cleaned_price = price_str.replace("Euro", "").strip()
    # Remove thousands separators (dots) and replace decimal comma with period
    numeric_str = cleaned_price.replace(".", "").replace(",", ".")
    
    try:
        return float(numeric_str)
    except ValueError:
        raise TicketParsingError(f"Could not parse price '{price_str}' for ticket '{title}'")

def extract_card_type(title: str) -> str:
    for t in ["25", "50", "100"]:
        if f"BahnCard {t}" in title:
            return t
    raise TicketParsingError(f"Could not determine BahnCard type from title: '{title}'")

def validate_ticket(ticket: dict) -> None:
    required_fields = {
        "headline": str,
        "price": dict,
    }
    
    for field, expected_type in required_fields.items():
        if field not in ticket:
            raise TicketParsingError(f"Missing required field '{field}'")
        if not isinstance(ticket[field], expected_type):
            raise TicketParsingError(
                f"Field '{field}' must be of type {expected_type.__name__}, "
                f"got {type(ticket[field]).__name__}"
            )
    
    if "price" not in ticket["price"]:
        raise TicketParsingError("Missing 'price' field in price object")

def process_tickets(tickets: list[dict]) -> dict:
    if not isinstance(tickets, list):
        raise TicketParsingError(f"Input must be a list, got {type(tickets)}")
    
    # Initialize categories
    result = {
        "timestamp": datetime.utcnow().isoformat() + "Z",  # Add 'Z' to indicate UTC
        "tickets": {
            "U18": [],
            "U26": [],
            "U64": [],
            "Senior": [],
            "Ermaessigt": []
        }
    }
    
    for ticket in tickets:
        validate_ticket(ticket)
        
        title = ticket["headline"]
        price = parse_price(ticket["price"]["price"], title)
        card_type = extract_card_type(title)
            
        # Create ticket info
        ticket_info = {
            "title": title,
            "price": price,
            "class": "2" if "2. Klasse" in title else "1" if "1. Klasse" in title else None,
            "type": card_type,
            "isProbe": "Probe" in title
        }
        
        # Track if ticket was categorized anywhere
        categorized = False
        
        # Categorize based on rules
        if "Jugend" in title or ("My" in title and "BahnCard" in title):
            result["tickets"]["U18"].append(ticket_info)
            categorized = True
            
        if "My" in title and "BahnCard" in title:
            result["tickets"]["U26"].append(ticket_info)
            categorized = True
            
        if all(prefix not in title for prefix in ["My", "Jugend", "Senioren", "Ermäßigt"]):
            result["tickets"]["U64"].append(ticket_info)
            categorized = True
            # Add Probe cards to all categories except Ermaessigt
            if "Probe" in title:
                for cat in ["U18", "U26", "U64", "Senior"]:
                    if ticket_info not in result["tickets"][cat]:
                        result["tickets"][cat].append(ticket_info)
            
        if "Senioren" in title:
            result["tickets"]["Senior"].append(ticket_info)
            categorized = True
            
        if "Ermäßigt" in title:
            result["tickets"]["Ermaessigt"].append(ticket_info)
            categorized = True
            
        if not categorized:
            raise TicketParsingError(f"Ticket '{title}' did not match any category rules")

    # Verify each category has at least one ticket
    empty_categories = [cat for cat, tickets in result["tickets"].items() if not tickets]
    if empty_categories:
        raise TicketParsingError(f"Categories {empty_categories} have no tickets")

    return result

def main():
    try:
        # Read JSON from stdin
        try:
            tickets = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON input: {str(e)}", file=sys.stderr)
            sys.exit(1)
        
        # Process tickets
        try:
            result = process_tickets(tickets)
        except TicketParsingError as e:
            print(f"Error processing tickets: {str(e)}", file=sys.stderr)
            sys.exit(1)
        
        # Output to stdout
        json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
        
    except Exception as e:
        print(f"Unexpected error: {str(e)}", file=sys.stderr)
        sys.exit(1)


# Use eg with (using nushell)
# http get https://www.bahn.de/.rest/offers/tiles?site=next-bahn-de&lang=de&id=ed168952-2068-41f4-bf46-f7e12b4606b6&id=d6368836-ec6d-4cf7-8b7c-303b3ed9b5d0&id=bb255f33-6b44-4c99-8830-68d88190c2ea&id=2db91b14-a7c9-451e-a414-fa591eca6934&id=c3e044c1-b878-47cb-97a2-effa1a3c1930&id=ed00a7a5-ce0d-4837-abed-28d734d52071&id=bafb8ad9-8371-417f-b3a4-f6c20c7bc581&id=da65bba3-0fc3-433b-9f7b-7109ccc5b4e0&id=277b35f5-134a-4d90-a318-71898fa6d340&id=28ab92b1-8406-498c-8338-7029493129ff&id=713a8500-b889-416d-9b21-57393e467b75&id=f19cfc91-74c2-4af3-a624-693ca3ad5ed5&id=e6007464-1e8e-4ca1-964b-51b839e8d7b1&id=585d1b81-c7b8-4b29-aaf9-df83e7786d39&id=0ab68d69-00a9-453b-8813-d36a35680733&id=65e12b6d-3174-460b-91ad-b611e8584474&id=a1ab7b77-7cc8-4b9a-a0ef-16e8c0baf4a0&id=04ee32df-5ab3-45fe-ba40-abd445d13095&id=c985b7e9-205f-45f6-a987-fa66334dfb01&id=38f2b6d6-23d5-4b5e-9fcc-02cb7107085e&id=5bae8c35-e196-457a-99b4-fa73a979668a&id=d9975872-412b-41b3-b57d-aba12770a4d8&id=210a4723-4c35-449f-8e1a-31676269ad65&id=97f030e2-43af-45b5-916f-0183b4065598&id=025d507f-31be-4a28-9b69-09818484145e&id=b24b108c-bfe2-4650-953d-ea7bca5fba14&id=7fda0736-d0f1-4bca-9707-09c495b22271 | save bahn.json
# cat bahn.json | python process-prices.py | save src/tickets.json
# Above web request can be extracted from https://www.bahn.de/angebot/bahncard
if __name__ == "__main__":
    main()
