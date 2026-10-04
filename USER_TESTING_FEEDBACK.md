
roll organization accounts into house accounts - call them partner organization
implement supabase
input validation for all form fields

bifurcate users when signing up or signing in for drivers and partner organizations.

once users sign in, the screen will show all the available actions that user can do.
past rides - most recent should be at the top, not the bottom.

### Organizations
signing in should directly go to the dashboard instead of the landing page

time picker should have current time highlighted
    shouldnt show times in the past
    revamp calendar widget to meet the rest of the web design 

when no driver is available, the alternatives dont do anything
limit amount of people allowed in a vehicle when requesting rides

allow people to undo actions or edit their requests. 
preserve data when pressing back button or close tab.
request ride button not visible on every page for the partner organization account.

while you're filling out the request, let user know if no drivers are available with this option (eg no wheelchair access drivers) and scheduled time

confusion about what to pick when creating an organization (removing transport provider will help for now)

remove "reason for the trip" field
if more than one rider is selected, allow you to set multiple names.
number of people riding should be "passengers"

add a go back to dashboard button when done creating a ride.

### Drivers
combine requests tab with my rides tabs - users don't know where their accepted rides go once they accept.
google maps integration for directions - how long to get to pickup location, how long the ride will be, show map of the route. 
Drivers encouraged to send ETA of pickup (optional)

"tell the house" label is weird
lacking fanfare of completing a ride
notification popup is not needed for driver - it's already showing up in the page
when no drivers accept the request by the time the ride needs to start, auto-cancel the request
^ if the request passes the scheduled time, it should also expire.

make the ux flow - once the driver accepts the ride, to be more inutitive and sequential, reversible if you change your mind, make sure that the address where they pick up the person is displayed. make the elements describe how it's supposed to work - as it is, it's not clear whether a button is an indicator, and some button labels are random. make it look good.

clearer live progression of the driver experience
we don't need the toggle for accepting requests - user can just decline trips.

## FUTURE ENHANCEMENTS - don't implement yet.
Mobile app
Transport provider options (not just volunteer drivers)
integrate locations' data - eg. hospital wait times
calculate driver typical request acceptance response time.
rides that needs attention - need to look into it more.