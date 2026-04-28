import poplib
import sys

# POP3 server connection details
HOST = '127.0.0.1'
PORT = 1100

def test_pop3(username, password):
    print(f"Connecting to POP3 server at {HOST}:{PORT}...")
    try:
        # Connect to the POP3 server
        server = poplib.POP3(HOST, PORT)
        
        # Optional: Enable debug mode to see client-side logs
        server.set_debuglevel(1)
        
        # Print the welcome message
        print("Server Welcome:", server.getwelcome().decode('utf-8'))
        
        # Authenticate
        print(f"\nAuthenticating as {username}...")
        server.user(username)
        server.pass_(password)
        
        # Get mailbox status
        num_messages, total_size = server.stat()
        print(f"\nMailbox Status: {num_messages} messages, {total_size} bytes")
        
        if num_messages > 0:
            print("\nListing messages:")
            response, listings, octets = server.list()
            for listing in listings:
                print(listing.decode('utf-8'))
                
            print("\nFetching the first message...")
            # Retrieve the first message (index 1)
            response, lines, octets = server.retr(1)
            print("Message content:")
            for line in lines:
                print(line.decode('utf-8'))
                
        # Gracefully quit
        print("\nQuitting...")
        server.quit()
        print("Done.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_pop3.py <username> <password>")
        print("Example: python test_pop3.py ardayasan ardayasan123")
        sys.exit(1)
        
    test_pop3(sys.argv[1], sys.argv[2])
