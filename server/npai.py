import sys
import base64
import google.generativeai as genai
from openai import OpenAI
import os
import requests
import json
import re

# Configure APIs
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="https://api.x.ai/v1"
)

# Helper Functions
def analyze_with_grok(prompt):
    """Send a prompt to Grok 3 and return the response."""
    try:
        response = client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a transformation engine that strictly follows instructions and outputs "
                        "only in the specified format without any extra commentary or blank sub-messages."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            max_tokens=4096,
            temperature=0
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        if os.getenv('DEBUG_MODE') == 'true':
            print(f"Error communicating with Grok: {e}", file=sys.stderr)
        return "Error processing message"
        
def download_image(url):
    """Download an image from a URL to a temporary file."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        temp_path = f"temp_image_{os.getpid()}.jpg"
        with open(temp_path, "wb") as f:
            f.write(response.content)
        return temp_path
    except Exception as e:
        if os.getenv('DEBUG_MODE') == 'true':
            print(f"Failed to download image from {url}: {e}", file=sys.stderr)
        return None

def analyze_photo(photo_path: str) -> str:
    """Analyze a photo using Gemini and return a description."""
    if not photo_path or not os.path.exists(photo_path):
        if os.getenv('DEBUG_MODE') == 'true':
            print("Photo file not found or not provided", file=sys.stderr)
        return "Photo Analysis: Car (file not found)"

    try:
        with open(photo_path, "rb") as image_file:
            image_data = image_file.read()

        image = {
            "mime_type": "image/jpeg",
            "data": base64.b64encode(image_data).decode("utf-8")
        }

        prompt = (
            "You are an expert in vehicle identification. Analyze the provided image and describe it concisely. "
            "If it’s a vehicle, include these details if visible or identifiable:\n"
            "- Make (e.g., Mitsubishi, Toyota)\n"
            "- Model (e.g., Triton, Corolla)\n"
            "- Badge/Trim (e.g., SR5, XR6)\n"
            "- Color (e.g., blue, white)\n"
            "- Descriptive features (e.g., bullbar, canopy)\n"
            "- Registration/license plate number (rego, if visible, e.g., 123ABC)\n"
            "Format vehicle responses as a single string starting with 'Photo:', e.g., 'Photo: Blue Mitsubishi Triton SR5 rego 123ABC with bullbar'. "
            "Omit any details not identifiable, keeping it short. "
            "If the vehicle cannot be identified, return 'Photo: Car'. "
            "If the image is not a full vehicle (e.g., a car part, check engine light, invoice, oil or fluid - Brown or Black = Oil, Pink or Green = Coolent, Red = Brake Fluid), return a brief description starting with 'Photo Analysis: ', "
            "e.g., 'Photo Analysis: Check engine light', 'Photo Analysis: Motor oil', 'Photo Analysis: Invoice for Unique Automotive'. "
            "Keep all responses concise—no lengthy descriptions."
        )

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content([prompt, {"inline_data": image}])
        return response.text.strip()
    except Exception as e:
        if os.getenv('DEBUG_MODE') == 'true':
            print(f"Photo analysis error: {e}", file=sys.stderr)
        return "Photo Analysis: Car"

# Prompt Definitions
def prompt_1(original_message):
    """Prompt 1: Basic parsing of a car yard message into concise summaries with persistent senders."""
    prompt = f"""
You are analyzing a simple message from a car yard group chat. The input is formatted as 'Sender: Message' or 'Sender: Photo Analysis'. Some lines may start with '[PHOTO]' to indicate they came from a photo analysis. Every line should have a sender; propagate the last known sender (e.g., 'Christian') until a new sender appears. Use 'Unknown' only if no sender has been specified yet.

Summarise the main points from the batched messages, ensuring every line has a sender. Preserve the '[PHOTO]' marker if present.

Rules:
1. If something is listed on multiple lines, for example:
    Christian: Clean:
    - Triton
    - GTI
    - 2 from Unique 
Create a new summary for each line with the last sender ('Christian'). Output:
- Christian: Clean Triton
- Christian: Clean GTI
- Christian: Clean 2 cars from Unique 

2. Only return actionable statements. For example:
Christian: the AC for the gti doesn't work, its blowing hot air
Christian: fuck
Christian: nah thats okay
Christian: lets not get it to peter mode
Christian: i will order a relay for it, theyre like $10
Output:
- Christian: the AC in the GTI is malfunctioning and blowing hot air
- Christian: don't get Peter mode to inspect the GTI
- Christian: order a relay for the GTI AC they are around $10

3. Don't disregard information. For example:
- Christian: On my way to pick up Volvo from Maher going to essendon from there
Output:
- Christian: Christian is picking up Volvo from Maher and going to Essendon 
or 
- Christian: Lets fix the pajero brake lights and indicator light i fixed the horn alrady
Output:
- Christian: Fix Pajero Brake light and indicator. Horn is fixed 

4. Photo Analysis.
    - Always attach a photo analysis to a message 
    - Attach a photo analysis to the message that makes the most logical sense. In a lot of cases, a photo analysis will attach to the closest regular message that makes logical sense. 
        For example
        - Christian: Customer coming to see this today at 12
        - [PHOTO] Christian: Photo: Grey Volkswagen Golf R, rego 1OY2AJ
        - [PHOTO] Christian: Photo: White Ford Falcon FGX rego F6X175
        - Christian: this is at haythams
        Output 
        - [PHOTO] Christian: Customer coming to see Grey Volkswagen Golf R, rego 1OY2AJ today at 12pm
        - [PHOTO] Christian: White Ford Falcon FGX rego F6X175 is at Haytham's
    - Don't apply action from one regular message to both photos unless specific stated. For example "This is at unique" refers to one car/one photo. Whereas "These are at unique" would infer both cars/photo are at unique. 
        For example: 
        - Christian: This is at captial
        - [PHOTO] Christian: Photo: Grey Ford Ranger rego 1MY5FK with bullbar
        - [PHOTO] Christian: Photo: Black Lexus LS460 rego 100-0460
        - Christian: Gain is coming to do brake lights on this
        Output
        - [PHOTO] Christian: Grey Ford Ranger rego 1MY5FK with bullbar is at Capital
        - [PHOTO] Christian: Gian coming to do brake lights on Black Lexus LS460 rego 100-0460
        *Logic applied: "this is at captial" only applied to the ranger, not the lexus because the message doesn't indicate both being at captial 

5. If the sender infers they are doing something, reflect that. For example:
Sam: I will pick up the outlander at MMM
Output:
- Sam: Sam will pick up the outlander at MMM
or 
Joseph: I'm going to see Jim Lalo in the LDV
Output:
- Joseph: Joseph going to Jim Lalo in the LDV

7. Summarise every point on its own line. If something is ready, needs to be dropped off, etc. For example:
Christian: Haytham has the XR6 and Hilux ready. Let's take them to imad for the Ranger. Take the ranger to als
Output:
- Christian: XR6 and Hilux are ready at Haythams 
- Christian: Take the XR6 and Hilux at Haythams to Imad for the Ranger
- Christian: Take the Ranger at Imads to Al's

8. Include the too and from locations 
For example: 
Christian: I’m taking the Colorado from captial to Louie and coming back in the triton
Output:
- Christian: Christian is taking the Colorado from Capital to Louie
- Christian: Christian is coming back in the Triton from Louie

9. Don't split messages when something is a condition or a note
Example 
Christian: take Liberty to imad. Imad has nothing but will take it today
Output
Christian: take Liberty to imad. Imad has nothing but will take it today

Another Example:
- James: Imad is chasing $250 cash
- James: Expected me to have it with me
Output
- James: Imad is chasing $250 cash. He expected James to have it 

Another Example 
- James: Navara D22 white, sold at unique
- James: John to do rwc whole I wait
Output 
- James: Navara D22 white, sold at unique. John will do the RWC while james waits 

In this example its important because it means to still take the Liberty even though he has nothing ready

10. Handle conditional statements and multiple actions explicitly:
   - Split actions into separate lines when multiple cars or tasks are mentioned.
   - Preserve conditions as part of the summary (e.g., "if X happens, do Y").
   Example:
   - Christian: Honda accord is ready at unique. I will take the amarok that is sold to pick it up. If the Colorado sells, we can use that to pick up the amarok when it is ready.
   Output:
   - Christian: Honda Accord is ready at Unique
   - Christian: Christian will take the sold Amarok to Unique to pick up the Honda Accord
   - Christian: If the Colorado sells, take it to Unique to pick up the Amarok when it is ready
11. Use context to infer locations and other things. 
    Example:
   - James: Imad has the Prado and Hilux ready. Take him the Wrangler when it is ready at Als to pick them up.
    Output:
   - James: Imad has the Prado and Hilux ready. 
   - James: When the Wangler is ready at Al's, take it to Imad to pick up the Prado and Hilux 

12. Handle non car photos with messages. Sometimes non car photo analysis like "damaged" tyre can relate to other messages "like toyota corolla" 
    Example: 
    - [PHOTO] Christian: Photo Analysis: Motor oil on floor
    - Christian: Blue Astra 
    Output:
    - Christian: Blue Astra has potential oil leak

    Another Example
    - [PHOTO] Christian: Photo Analysis: Damaged tire.
    - Christian: blue astra needs to go to captial
    Output 
    - Christian: Blue astra needs to go to captial for tyre damage 

13. Handle non car photos with messages part 2. Sometimes the non car photo analysis can be incorrect. If the message infers something else about the photo, run with that. 
    Example:
    - [PHOTO] Christian: Photo Analysis: Car window regulator
    - Christian: Volvo sunroof motor on my desk
    Output:
    - Christian: Volvo sunroof motor on my desk

    In this example, the photo anlaysis was incorrect, saying it was a window regulator instead of a sunroof motor. Again, only make the correction if the message infers something different to the photo analysis. 

14. Use logic and common sense but messages should be split into as minimal lines as possible. 
    Example:
    - Christian: Hi team please don’t leave windows down in the cars. 
    Pkease put all windows up on Monday. You can leave drivers window down 2 inch’s or from 2 windows if just detailed.
    Cars get very messy with dust inside
    Output: 
    - Christian: Please don't leave windows up, only leave them down 2 inch's after detail. 
    - Christian: On Monday put all the windows up. 
    Another Example
    Example:
    - Sarah: Hey guys if we can - let’s not squeeze cars in anymore 😎 it might have to be bad luck if one or two need to be kept outside. It needs to be set up so that if one person is working on their own they are able to get cars out by themselves, as it gets pretty hard to take cars out if they are too close and don’t have anyone to guide
    Output:
    - Sarah: Let's not squeeze cars in anymore. We should set the yard up so that one person can get cars out on their own.

    Another Example:
    - [PHOTO] Christian: Photo: Car
    - Christian: Plan - taking Black Ranger XLT to capital
    - Christian: Taking pics of inferiors, tonneau cover is too small and back seats need a good clean, don't think Louie did the best job at them
    Output 
    - Christian: Plan - taking Black Ranger XLT to capital
    - Christian: Taking photos of Black Ranger XLT interiors
    - Christian: Black Ranger XLT tonneau cover is too small
    - Christian: Black Ranger XLT back seats need a clean 

15. If nothing is actionable, return nothing

Now, process:
{original_message}
"""
    return analyze_with_grok(prompt)

def prompt_2(original_message):
    """Prompt 2: Refine the summaries"""
    prompt = f"""
1. Add the entire name for the car if mentioned. For example:
- X5 to BMW X5
- Falcon to Ford Falcon
- XR6 to Ford Falcon XR6
- 120i to BMW 120i
- MUX to Isuzu MUX

2. If the summary line has two cars that require the same action, create a line for each car. An action can be: being ready, to be taken somewhere, etc. For example:
- Christian: Take the Colorado and SV6 at unique to Capital when Capital has the MUX ready
Output:
- Christian: Take the Holden Colorado at Unique to Capital when Capital has the Isuzu MUX ready
- Christian: Take the Holden Commodore SV6 at Unique to Capital when Capital has the Isuzu MUX ready
*Notice how we didn't create a new line for the Isuzu MUX because that car is part of the condition, not the action. Only split lines for the action.

3. Preserve the sender from each line.
4. Preserve the '[PHOTO]' marker if present.
5. Preserve relvant information like Colour and general descriptive words, Conditions ("When John has the <car> ready")

6. Car Makes and Models - Only Makes and Models sold in Australia and use the proper names  
Liberty = Subaru Liberty NOT Jeep Liberty 
Caddy = Volkswagen Caddy NOT Cadilac 
Prado = Toyota Landcruiser Prado NOT Toyota Prado
Colorado = Holden Colorado NOT Chevrolet
Challenger = Mitsubishi Challenger NOT Dodge Challenger 

Now process: 
{original_message}
"""
    return analyze_with_grok(prompt)

def prompt_3(original_message):
    """Prompt 3: Categorize the refined summaries"""
    prompt = f"""
You are provided with sub-messages from a car yard group chat, each prefixed with a sender (e.g., 'Christian:', 'Unknown:'). Some messages may start with '[PHOTO]' to indicate they came from a photo analysis. For each sub-message, assign exactly one category from the following list:
- Ready: Car(s) are ready.
- Drop Off: Car(s) need to be dropped off, picked up, or swapped. For example: "Take the Isuzu D-MAX to Capital" 
- Customer Appointment: A customer is scheduled to view a car. 
- Reconditioning Appointment: A service or repair appointment. 
- Location Update: A car’s location has change or is currently changing. For example "Christian is picking up the Ford Falcon from Haytham and taking it to Imad" or "Dad is swapping the Honda Civic with the Isuzu D-MAX at Sky"
- To Do: Actionable tasks such as orders or follow-ups. 
- Notes: Things that aren't actionable but staff should remember. Eg "<car> is clean" or "<part> is upstairs" 
- Car Repairs: Not recoditioning appointments but jobs that need to be done. "The holden colorado needs a front bumper" or "The toyota landcruiser prado is leaking oil". 

Name of our mobile reconditioners, if these names appear, it likely means it’s a reconditioning appointment:
- Rick | Interior Repair - Minor | Mobile
- Jan, Jian, Gian, Gan | Auto Electrician | Mobile
- Ermin | Dint Repair | Mobile
- Richo | Windscreen Tint | Mobile
- National, National Windscreens | Windscreens | Mobile
- Bill, Billie, Billie Windscreen, Bill Windscreen | Windscreens | Mobile
- Keith, Keither Alloy Wheels | Wheel Repair | Mobile
- Chinamen, Jack | Wheel Repair | Mobile
- Browny, Brownie, Darrel, Daz, Darrel Down | Touch up paint | Mobile

If the message infers we need to book them

Rule 1: in rare cases a message may fall into two categories, add the message to both categories. 
Example 
- Christian: ix35 pickup at bjm - it should be ready later today. 

That line falls into both Drop Off and Ready categories so duplicate the message and make one for each category 

Another Example

- Christian:Plan to swap Hyundai I30 ylk029 with Mazda 6 at Unique this afternoon

That line falls into both Drop Off and Ready categories so duplicate the message and make one for each category 

Another Example 
- Christian: Toyota Landcruiser Prado Kakadu xc769g at Al's has a potential wheel bearing issue

That line falls into both Location update and Car Repairs 

Rule 2: for reconditioner appointment, if someone not in the list is mentioned but the list mentions someone coming to do car repairs add a recondtioner appointment with that persons name. 
Example
- Joseph: Simon coming to fix the Hilux suspension should fall into the reconidtioner appointment category 

Rule 3: If message says "someone coming to see <car(s)>" this is a customer appointment 

Rule 4: If message says "Custmomer is coming to pick up <car>", then this should be a customer appointment 

Rule 5: If message mentions car being delivered it most likely means customer appointment

Rule 6: If message mentions "Lets bring in <car>" it should be a to do task as its refering to bring a car in off the street 

Rule 7: If a message mentions a car going somehwere for a service, or RWC, or any repairs it will be a (drop off or location update) AND (car repairs)
Example 
- Christian:Nissan Navara D22 white, sold at Unique. John will do the RWC while Christian waits
 Output 
- Christian:Nissan Navara D22 white, sold at Unique. John will do the RWC while Christian waits: Location Update 
- Christian:Nissan Navara D22 white, sold at Unique. John will do the RWC while Christian waits: Car Repairs 

Rule 8: When a message refers to a person or location having nothing ready in general, this is not a ready message, this is a note. If the message refers to a specific car, then that is a ready catgeory message. 
For example 
- James: Haytham has nothing ready = Notes
- James: John doesn't have the Isuzu D-MAX ready = Ready 

Rule 9: If refers to something needing a clean, this is a To Do category NOT Car Repairs

Output: 
- [PHOTO] <Name of sender>:<summary>:<Category> (preserve the [PHOTO] marker if present in the input)
    
{original_message}
"""
    return analyze_with_grok(prompt)

def prompt_ready(sub_message):
    """Prompt for Ready category"""
    prompt = f"""
For each line create a list. Lists will then be used to update our inventory list.
Index 1 - Make (ford, holden, toyota)
Index 2 - Model (civic, Landcruiser Prado, Megane)
Index 3 - Badge (GLX, RS, GTI)
Index 4 - Description (Blue, Bullbar, Canopy - include all descriptive features like 'with bullbar' here)
Index 5 - Registration (1HU4SH - must match a pattern like 'rego ABC123', do not include descriptive features here)
Index 6 - Current Location ("Ready at Haythams" - Location = Haythams)
Index 7 - Ready status. If the car is ready, or when it will be (Ready, Not ready, 1pm, tomorrow). 
Index 8 - Notes: Anything that should be noted. 

Output Format 
- Message : List

Example:
- Christian:Grey Volkswagen Golf R rego 1OY2AJ is ready at Al's
- Sam: Holden Commodore SV6 will be ready at 2 at Unique. 
Output 
- Christian:Grey Volkswagen Golf R rego 1OY2AJ is ready at Al's : [Volkswagen, Golf, R, Grey, 1OY2AJ, Al's, Ready]
- Sam: Holden Commodore SV6 will be ready at 2 at Unique. : [Holden, Commodore, SV6, , , Unique, 2pm]

Rules:
1. If a message just mentions "Car" and not a specific car, in index 1, make it "Car" and leave index 2 and 3 blank. 
For example
- Christian: Haytham has 1 car ready
Output 
- Christian: Haytham has 1 car ready : [Car, , , , , Haytham, Ready, ]

2. Ensure that descriptive features like 'with bullbar' are included in the Description field (index 4), not in the Registration field (index 5).
3. The Registration field (index 5) should only contain the actual rego (e.g., 1HU4SH), not descriptive words like 'bullbar'.
4. Extract the rego correctly by looking for the pattern 'rego ABC123' in the message.
5. Combine all descriptive features (color, features like bullbar) into the Description field.

Example:
- Christian: Silver Nissan Pathfinder with bullbar, rego 1MJ3VS is ready at AKS
Output
- Christian: Silver Nissan Pathfinder with bullbar, rego 1MJ3VS is ready at AKS : [Nissan, Pathfinder, , Silver with bullbar, 1MJ3VS, AKS, Ready]

Rule 2: If there is a list within the car for example in the notes index "tonneau cover too small, back seats need cleaning" so it doesn't mess up the indexing use the word "and" so ""tonneau cover too small and back seats need cleaning"
{sub_message}
"""
    return analyze_with_grok(prompt)

def prompt_drop_off(sub_message):
    """Prompt for Drop Off category"""
    prompt = f"""
For each line create a list. Lists will then be used to update our inventory list.
Index 1 - Make (ford, holden, toyota)
Index 2 - Model (civic, Landcruiser Prado, Megane)
Index 3 - Badge (GLX, RS, GTI)
Index 4 - Description (Blue, Bulbar, Canopy)
Index 5 - Registration (1HU4SH)
Index 6 - Current Location ("Take the Honda Civic from Imad to Unique" - Current Location = Imad)
Index 7 - Next Location: Where the car needs to go ("Take the Honda Civic from Imad to Unique" - Next Location = Unique, If it doesn't specify where the car is going just say "picked up")
Index 8 - Notes: Anything that should be noted. For example "Take the Honda Civic to Imad when he has the Toyota Hilux ready" - Notes = "When he has the Toyota Hilux ready" 

Output Format 
- Sender: Message : List [make, model, badge, description, registration, current location, next location, notes]

Example
 - Christian: When Al has the Toyota Hilux ready, take him the Toyota Landcruiser Prado
- Christian: When Al has the Toyota Hilux ready, take him the Ford Falcon
Output 
 - Christian: When Al has the Toyota Hilux ready, take him the Toyota Landcruiser Prado : [Toyota, Landcruiser Prado, , , , , Al's, When Al has the Toyota Hilux Ready]
- Christian: When Al has the Toyota Hilux ready, take him the Ford Falcon :  [Ford, Falcon, , , , , Al's, When Al has the Toyota Hilux Ready]

Rules:
1. If a messages just mentioned "Car" and not a specific car. In index 1, make it "Car" and leave index 2 and 3 blank. 
For example
- Christian: Take a Car to Imad
Output 
- Christian: Take a Car to Imad : [Car, , , , , , Imad, ]

Example:
- Christian: Blue Kia Optima is sold and will be taken to Al's
- Christian: Swap the Blue Kia Optima with the Toyota Prado Kakadu
- Christian: Swap the Blue Kia Optima with the Subaru Liberty
OUTPUT 
- Christian: Blue Kia Optima is sold and will be taken to Al's : [Kia, Optima, , Blue, , , Al's, Is sold]
- Christian: Swap the Blue Kia Optima with the Toyota Prado Kakadu : [Toyota, Landcruiser Prado, , , , , Picked up, Swap for kia optima]
- Christian: Swap the Blue Kia Optima with the Subaru Liberty : [Subaru, Liberty, , , , , Picked up, Swap for kia optima]

Another Example:
  - Christian:Christian will use the sold Volkswagen Amarok to swap for the Honda Accord at Unique
  - Christian:If the Holden Colorado sells, use it to pick up the Volkswagen Amarok at Unique
 OUTPUT
  - Christian:Christian will use the sold Volkswagen Amarok to swap for the Honda Accord at Unique : [Volkswagen, Amarok, , , , Unique, Swap for Honda Accord]
  - Christian:If the Holden Colorado sells, use it to pick up the Volkswagen Amarok at Unique : [Holden, Colorado, , , , , Unique, When the Amarok is ready]

Rule 2: If there is a list within the car for example in the notes index "tonneau cover too small, back seats need cleaning" so it doesn't mess up the indexing use the word "and" so ""tonneau cover too small and back seats need cleaning"
{sub_message}
"""
    return analyze_with_grok(prompt)

def prompt_customer_appointment(sub_message):
    """Prompt for Customer Appointment category"""
    prompt = f"""
For each line create a list. Lists will then be used to update our customer appointment list.
Index 1 - Make (ford, holden, toyota)
Index 2 - Model (civic, Landcruiser Prado, Megane)
Index 3 - Badge (GLX, RS, GTI)
Index 4 - Description (Blue, Bulbar, Canopy)
Index 5 - Registration (1HU4SH)
Index 6 - Customer Name
Index 7 - Day of appointment 
Index 8 - Time of appointment 
Index 9 - Notes: anything to note about the appointment, e.g has a trade in, wants finance.
Index 10 - Delivery: If it is about a customer picking up/delivery of a sold car, write "delivery" 

If no day is mentioned, say "Could be today"
If no time is mentioned, leave it blank

Example
- Joseph: Chris is coming to see the Holden Colorado Wednesday at 12pm. He has a trade in.
Output
- Joseph: Chris is coming to see the Holden Colorado Wednesday at 12pm. He has a trade in : [Holden, Colorado, , , , Chris, Wednesday, 12pm, Trade in, ]

Rule: If a car is sold mention it in the notes, or if the messages says "coming to pick up" infer it as sold
Example:
- Christian: Customer coming to pick up the sold Kia Optima today at 4:40pm
Output
- Christian: Customer coming to pick up the sold Kia Optima today at 4:40pm : [Kia, Optima, , , , , today, 4:40pm, Sold Customer Pickup, Delivery]

Rule 1: If there is a list within the car for example in the notes index "tonneau cover too small, back seats need cleaning" so it doesn't mess up the indexing use the word "and" so ""tonneau cover too small and back seats need cleaning"

{sub_message}
"""
    return analyze_with_grok(prompt)

def prompt_reconditioning_appointment(sub_message):
    """Prompt for Reconditioning Appointment category"""
    prompt = f"""
For each line create a list. Lists will then be used to update our reconditioner appointment list.
Index 1 - Make (ford, holden, toyota)
Index 2 - Model (civic, Landcruiser Prado, Megane)
Index 3 - Badge (GLX, RS, GTI)
Index 4 - Description (For example Blue, Bulbar, Canopy)
Index 5 - Registration (1HU4SH)
Index 6 - Reconditioner Name
Index 7 - Day of appointment 
Index 8 - Time of appointment 
Index 9 - Notes: anything to note about the appointment. Usually this will be about the work they are doing, e.g Steering wheel.

Example
- Joseph: Rick coming to do Gold Ford Territory seats today 
Output
- Joseph: Rick coming to do Ford Territory seats today : [Ford, Territory, , Gold, , Rick, Today, , Seats]

Rule 1: If there is a list within the car for example in the notes index "tonneau cover too small, back seats need cleaning" so it doesn't mess up the indexing use the word "and" so ""tonneau cover too small and back seats need cleaning"

{sub_message}
"""
    return analyze_with_grok(prompt)

def prompt_car_repairs(sub_message):
    """Prompt for Car Repairs category"""
    prompt = f"""
For each line create a list. Lists will then be used to update our internal car repair list and create reconditioner appointments.
Index 1 - Make (ford, holden, toyota)
Index 2 - Model (civic, Landcruiser Prado, Megane)
Index 3 - Badge (GLX, RS, GTI)
Index 4 - Description (Blue, Bullbar, Canopy)
Index 5 - Registration (1HU4SH)
Index 6 - Repair Task: The specific repair job to be done internally (e.g., "Fix AC", "Replace front bumper", "Check oil leak", "Check tyre damage")
Index 7 - Notes: Any additional notes

Output Format 
- Message : List

Example:
- Christian: Fix the AC on the Volkswagen GTI
Output:
- Christian: Fix the AC on the Volkswagen GTI : [Volkswagen, GTI, , , , Fix AC, ]

Rule 1: If there is a list within the car for example in the notes index "tonneau cover too small, back seats need cleaning" so it doesn't mess up the indexing use the word "and" so "tonneau cover too small and back seats need cleaning"
Example 
- Christian: Black Ford Ranger XLT tonneau cover is too small : [Ford, Ranger, XLT, Black, , Tonneau cover too small, ]

PLEASE ENSURE ALL INDEXES ARE CORRECT 

{sub_message}
"""
    return analyze_with_grok(prompt)

def prompt_reconditioner_category(repair_task):
    """Prompt to classify a repair task into a reconditioner category and assign a reconditioner"""
    prompt = f"""
You are analyzing a car repair task to determine the appropriate reconditioner category and assign a reconditioner. The task is: "{repair_task}".

Available reconditioner categories and their associated reconditioners:
- interior minor: Rick
- dents: Ermin
- auto electrical: Jan, Jian, Gian, Gan
- battery: Brad Floyd
- A/C: Peter Mode, Goren
- Windscreen: National, Billie
- Tint: Richo
- Touch Up: Browny, Darrel
- wheels: Keith, Chinamen, Jack
- Mechanic: Technician
- Body: Technician
- Interior Major: Technician
- other: Technician

Rules:
1. Analyze the repair task and match it to the most appropriate category based on keywords:
   - "seat", "upholstery", "interior clean" -> interior minor
   - "dent", "panel", "bodywork" -> dents
   - "electrical", "wiring", "brake lights", "indicator", "relay" -> auto electrical
   - "battery" -> battery
   - "AC", "air conditioning", "compressor", "regas" -> A/C
   - "windscreen", "windshield" -> Windscreen
   - "tint", "window tint" -> Tint
   - "paint", "touch up", "scratch" -> Touch Up
   - "wheel", "rim", "tyre damage" -> wheels
   - "engine", "transmission", "suspension", "wheel bearing" -> Mechanic
   - "bumper", "panel replacement", "body repair" -> Body
   - "dashboard", "seat replacement", "major interior" -> Interior Major
   - Any other task -> other
2. If the task matches a category with multiple reconditioners, select the first one listed (e.g., for auto electrical, select "Jan").
3. Return a list with the category and reconditioner name.

Output Format:
[<category>, <reconditioner_name>]

Example:
Task: "Fix AC on Volkswagen GTI"
Output: [A/C, Peter Mode]

Task: "Repair dent on Toyota Corolla"
Output: [dents, Ermin]

Task: "Replace engine on Holden Colorado"
Output: [Mechanic, Technician]

Task: "Fix bumper on Ford Falcon"
Output: [Body, Technician]

Task: "Replace dashboard on Subaru Liberty"
Output: [Interior Major, Technician]

Now process:
{repair_task}
"""
    return analyze_with_grok(prompt).strip('[]').split(', ')

def prompt_location_update(sub_message):
    """Prompt for Location Update category"""
    prompt = f"""
For each line create a list. Lists will then be used to update our inventory list.
Index 1 - Make (ford, holden, toyota)
Index 2 - Model (civic, Landcruiser Prado, Megane)
Index 3 - Badge (GLX, RS, GTI)
Index 4 - Description (Blue, Bullbar, Canopy - include all descriptive features like 'with bullbar' here)
Index 5 - Registration (1HU4SH - must match a pattern like 'rego ABC123', do not include descriptive features here)
Index 6 - Old location ("James is picking up the Holden Colorado from Al's and taking it to Imad" - Old Location = Al's. "Sarah is picking up Honda Civic from Capital" - Old Location = Capital)
Index 7 - New Location ("Ford Falcon is at Capital" - current location = Capital. "Christian picking up the Holden Colorado and taking it to Al's" - Location = Al's. "Sam picking up the BMW X5 from Sky" - Location = With Sam)
Index 8 - Notes: anything worth noting ("He will do while he waits")

Output Format 
- Message : List

Rules
- If someone is picking that car up and no next location is specified then the location is set to "with <sender's name>"
- Ensure that descriptive features like 'with bullbar' are included in the Description field (index 4), not in the Registration field (index 5).
- The Registration field (index 5) should only contain the actual rego (e.g., 1HU4SH), not descriptive words like 'bullbar'.
- If messages says "back from <location>" make the new location "Northpoint" 
Rule : If there is a list within the car for example in the notes index "tonneau cover too small, back seats need cleaning" so it doesn't mess up the indexing use the word "and" so "tonneau cover too small and back seats need cleaning"

Example
- Christian: James is taking the Holden Colorado to Al's
- Christian: James is picking up the Toyota Corolla from Al's
- Christian: Silver Nissan Pathfinder with bullbar, rego 1MJ3VS is at Al's
Output
- Christian: James is taking the Holden Colorado to Al's : [Holden, Colorado, , , , , Al's, ]
- Christian: James is picking up the Toyota Corolla from Al's : [Toyota, Corolla, , , , Al's, with James, ]
- Christian: Silver Nissan Pathfinder with bullbar, rego 1MJ3VS is at Al's : [Nissan, Pathfinder, , Silver with bullbar, 1MJ3VS, , Al's, ]

{sub_message}
"""
    return analyze_with_grok(prompt)

def prompt_to_do(sub_message):
    """Prompt for To Do category"""
    prompt = f"""
For each line create a list. Lists will then be used to update our to do list.
Index 1 - Make (e.g ford, holden, toyota)
Index 2 - Model (e.g civic, Landcruiser Prado, Megane)
Index 3 - Badge (e.g GLX, RS, GTI)
Index 4 - Description (e.g Blue, Bulbar, Canopy)
Index 5 - Registration (e.g 1HU4SH)
Index 6 - Task

Output Format 
- Message : List

Example 
- Christian: Photograph the Alfa Romeo 
- Sam: Follow up Jenny
Output 
- Christian: Photograph the Alfa Romeo : [Alfa Romeo, , , , , Photograph]
- Sam: Follow up Jenny :  [, , , , , Follow up Jenny]

Rule 1: If there is a list within the car for example in the notes index "tonneau cover too small, back seats need cleaning" so it doesn't mess up the indexing use the word "and" so "tonneau cover too small and back seats need cleaning"
Example
- Christian: Black Ford Ranger XLT back seats need a clean
Output 
- Christian: Black Ford Ranger XLT back seats need a clean : [Ford, Ranger, XLT, Black, , Back seats need a clean]

{sub_message}
"""
    return analyze_with_grok(prompt)

def prompt_notes(sub_message):
    """Prompt for Notes category"""
    prompt = f"""
For each line create a list. Lists will then be used to update our to do list.
Index 1 - Make (ford, holden, toyota)
Index 2 - Model (civic, Landcruiser Prado, Megane)
Index 3 - Badge (GLX, RS, GTI)
Index 4 - Description (Blue, Bulbar, Canopy)
Index 5 - Registration (1HU4SH)
Index 6 - Notes

Output Format 
- Message : List

Example
- Christian: Capital doesn't want anymore cars this week
Output
- Christian: Capital doesn't want anymore cars this week : [,,,,,Capital doesn't want anymore cars this week]

Another Example 
- Christian: Please don't leave windows down in the cars, only leave them down 2 inches after detail
Output 
- Christian: Please don't leave windows down in the cars, only leave them down 2 inches after detail : [ , , , , , Please don't leave windows down in the cars, only leave them down 2 inches after detail]

Rule 1: Don't be afraid to include a large notes section. Be as descriptive in the notes as necessary. 

Rule 2: If there is a list within the car for example in the notes index "tonneau cover too small, back seats need cleaning" so it doesn't mess up the indexing use the word "and" so "tonneau cover too small and back seats need cleaning"

Example 
 - Christian: Let's not squeeze cars in anymore. We should set the yard up so that one person can get cars out on their own
Output
 - Christian: Let's not squeeze cars in anymore. We should set the yard up so that one person can get cars out on their own : [ , , , , , Let's not squeeze cars in anymore. We should set the yard up so that one person can get cars out on their own]

{sub_message}
"""
    return analyze_with_grok(prompt)

# Orchestration
def run_pipeline(original_message: str, media_url: str = None) -> dict:
    """Process the incoming message through prompts and return structured JSON."""
    if os.getenv('DEBUG_MODE') == 'true':
        print(f"Raw input received: {original_message}", file=sys.stderr)

    # Track photo messages explicitly
    photo_messages = []
    if media_url:
        photo_path = download_image(media_url)
        if photo_path:
            photo_analysis = analyze_photo(photo_path)
            os.remove(photo_path)
            if os.getenv('DEBUG_MODE') == 'true':
                print(f"Photo analysis result: {photo_analysis}", file=sys.stderr)
            # Prepend photo analysis with sender from the message, with [PHOTO] marker
            first_sender = original_message.split(": ", 1)[0] if ": " in original_message else "Unknown"
            photo_message = f"[PHOTO] {first_sender}: {photo_analysis}"
            photo_messages.append(photo_message)
            original_message = f"{photo_message}\n\n{original_message}"

    # Keep track of which messages are from photos
    message_lines = original_message.split('\n')
    photo_message_indices = [i for i, line in enumerate(message_lines) if '[PHOTO]' in line]

    # Run initial three prompts
    output_prompt1 = prompt_1(original_message) if original_message.strip() else ""
    if os.getenv('DEBUG_MODE') == 'true':
        print(f"Prompt 1 output: {output_prompt1}", file=sys.stderr)
    output_prompt2 = prompt_2(output_prompt1) if output_prompt1.strip() else ""
    if os.getenv('DEBUG_MODE') == 'true':
        print(f"Prompt 2 output: {output_prompt2}", file=sys.stderr)
    output_prompt3 = prompt_3(output_prompt2) if output_prompt2.strip() else ""
    if os.getenv('DEBUG_MODE') == 'true':
        print(f"Prompt 3 output: {output_prompt3}", file=sys.stderr)

    # Process category-specific prompts
    category_outputs = {
        "Ready": [],
        "Drop Off": [],
        "Customer Appointment": [],
        "Reconditioning Appointment": [],
        "Car Repairs": [],
        "Location Update": [],
        "To Do": [],
        "Notes": []
    }

    if output_prompt3.strip():
        for idx, line in enumerate(output_prompt3.split("\n")):
            if line.strip():
                try:
                    # Check if the line starts with [PHOTO]
                    is_from_photo = line.startswith("[PHOTO]")
                    # Remove [PHOTO] for parsing but preserve the flag
                    clean_line = line.replace("[PHOTO] ", "") if is_from_photo else line
                    parts = clean_line.rsplit(":", 2)
                    if len(parts) == 3:
                        sender, summary, category = parts
                        # Remove leading dash and space from sender, if present
                        sender = sender.strip().lstrip("- ").strip()
                        # Trim category to remove any leading/trailing spaces
                        category = category.strip()
                        # Construct sub_message without the leading dash
                        sub_message = f"{sender}: {summary}"
                        if os.getenv('DEBUG_MODE') == 'true':
                            print(f"Processing category: '{category}', sub_message: {sub_message}", file=sys.stderr)
                        # Determine if this message corresponds to a photo message
                        summary_without_sender = summary.strip()
                        is_from_photo = any(summary_without_sender in pm.split(": ", 1)[1] for pm in photo_messages)
                        if os.getenv('DEBUG_MODE') == 'true':
                            print(f"Line {idx}: {line}, is_from_photo: {is_from_photo}, summary: {summary_without_sender}", file=sys.stderr)
                            print(f"Photo messages to compare: {photo_messages}", file=sys.stderr)
                        result = None
                        if category == "Ready":
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Calling prompt_ready with: {sub_message}", file=sys.stderr)
                            result = prompt_ready(sub_message)
                        elif category == "Drop Off":
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Calling prompt_drop_off with: {sub_message}", file=sys.stderr)
                            result = prompt_drop_off(sub_message)
                        elif category == "Customer Appointment":
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Calling prompt_customer_appointment with: {sub_message}", file=sys.stderr)
                            result = prompt_customer_appointment(sub_message)
                        elif category == "Reconditioning Appointment":
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Calling prompt_reconditioning_appointment with: {sub_message}", file=sys.stderr)
                            result = prompt_reconditioning_appointment(sub_message)
                        elif category == "Car Repairs":
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Calling prompt_car_repairs with: {sub_message}", file=sys.stderr)
                            result = prompt_car_repairs(sub_message)
                            # Analyze repair task for reconditioner category
                            repair_task = result.split(" : ")[1].strip().lstrip('[').rstrip(']').split(',')[5].strip()
                            if repair_task:
                                reconditioner_result = prompt_reconditioner_category(repair_task)
                                if os.getenv('DEBUG_MODE') == 'true':
                                    print(f"Reconditioner category result: {reconditioner_result}", file=sys.stderr)
                                # Append reconditioner info to the result
                                result = f"{result} : {reconditioner_result}"
                        elif category == "Location Update":
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Calling prompt_location_update with: {sub_message}", file=sys.stderr)
                            result = prompt_location_update(sub_message)
                        elif category == "To Do":
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Calling prompt_to_do with: {sub_message}", file=sys.stderr)
                            result = prompt_to_do(sub_message)
                        elif category == "Notes":
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Calling prompt_notes with: {sub_message}", file=sys.stderr)
                            result = prompt_notes(sub_message)
                        else:
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Unknown category: '{category}'", file=sys.stderr)
                            continue
                        if os.getenv('DEBUG_MODE') == 'true':
                            print(f"Result from category prompt: {result}", file=sys.stderr)
                        if result:
                            parsed_output = parse_category_output(result, is_from_photo)
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"Parsed output for {category}: {parsed_output}", file=sys.stderr)
                            category_outputs[category].extend(parsed_output)
                        else:
                            if os.getenv('DEBUG_MODE') == 'true':
                                print(f"No result returned from category prompt for {category}", file=sys.stderr)
                    else:
                        if os.getenv('DEBUG_MODE') == 'true':
                            print(f"Malformed line: {line}", file=sys.stderr)
                except Exception as e:
                    if os.getenv('DEBUG_MODE') == 'true':
                        print(f"Failed to parse line: {line} - {str(e)}", file=sys.stderr)
                    continue

    # Prepare JSON output
    output = {
        "prompt1": output_prompt1,
        "prompt2": output_prompt2,
        "prompt3": output_prompt3,
        "categories": category_outputs
    }

    if not output_prompt1.strip() and not output_prompt2.strip() and not output_prompt3.strip():
        output["error"] = "Unable to parse input"

    if os.getenv('DEBUG_MODE') == 'true':
        print(f"Final category outputs: {category_outputs}", file=sys.stderr)
    return output

def parse_category_output(output: str, is_from_photo: bool = False) -> list:
    """Parse category prompt output into a list of dictionaries, adding fromPhoto flag for rego."""
    results = []
    if not output.strip():
        if os.getenv('DEBUG_MODE') == 'true':
            print("No output to parse", file=sys.stderr)
        return results

    for line in output.split("\n"):
        if line.strip():
            try:
                # Split the line into message, list, and optional reconditioner parts
                parts = line.split(" : ")
                message = parts[0]
                list_str = parts[1]
                reconditioner_info = parts[2].strip('[]').split(', ') if len(parts) > 2 else None
                if os.getenv('DEBUG_MODE') == 'true':
                    print(f"Parsing line: {line}", file=sys.stderr)
                list_match = re.match(r'^\[(.*)\]$', list_str.strip())
                if list_match:
                    # Parse the list items, handling potential empty or malformed entries
                    raw_items = list_match.group(1).split(",")
                    items = []
                    for item in raw_items:
                        item = item.strip().strip('"')
                        if item == '""':
                            item = ""
                        items.append(item)
                    # Determine the expected length based on the category
                    expected_length = 9  # Default for Customer/Reconditioning Appointments
                    if "Car Repairs" in message:
                        expected_length = 7
                    elif "To Do" in message or "Notes" in message:
                        expected_length = 6
                    elif "Ready" in message or "Drop Off" in message or "Location Update" in message:
                        expected_length = 8
                    
                    # Pad or truncate the list to the expected length
                    while len(items) < expected_length:
                        items.append("")
                    if len(items) > expected_length:
                        items = items[:expected_length]
                    
                    # Only set fromPhoto to true if there is a rego and it came from a photo
                    rego = items[4] if len(items) > 4 else ""
                    from_photo_for_rego = is_from_photo and rego != ""
                    # Create result object
                    result_entry = {
                        "message": message,
                        "data": items,
                        "fromPhoto": from_photo_for_rego
                    }
                    # Add reconditioner info for Car Repairs
                    if reconditioner_info:
                        result_entry["reconditioner"] = {
                            "category": reconditioner_info[0],
                            "reconditioner": reconditioner_info[1]
                        }
                    # Log the parsed output
                    if os.getenv('DEBUG_MODE') == 'true':
                        print(f"Parsed category output: {message}, rego: {rego}, fromPhoto: {from_photo_for_rego}, items: {items}, reconditioner: {reconditioner_info}", file=sys.stderr)
                    # Append the result
                    results.append(result_entry)
                else:
                    if os.getenv('DEBUG_MODE') == 'true':
                        print(f"Invalid list format: {line}", file=sys.stderr)
            except Exception as e:
                if os.getenv('DEBUG_MODE') == 'true':
                    print(f"Error parsing category output: {line} - {str(e)}", file=sys.stderr)
                continue
    return results

# Main Entry Point
def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided. Usage: python npai.py <message> [media_url]"}))
        sys.exit(1)

    if sys.argv[1] == "--photo-only" and len(sys.argv) == 3:
        description = analyze_photo(sys.argv[2])
        print(json.dumps({"photo_analysis": description}))
        sys.exit(0)

    incoming_message = sys.argv[1]
    media_url = sys.argv[2] if len(sys.argv) > 2 else None
    result = run_pipeline(incoming_message, media_url)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()