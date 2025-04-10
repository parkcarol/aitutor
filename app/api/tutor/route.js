export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const question = searchParams.get('q')?.toLowerCase()

  const responses = {
    "what is newton's first law?": "Newton's First Law of Motion, also known as the law of inertia, states that an object will remain at rest or move in a straight line at a constant speed unless acted upon by an external force. This means that if no net force is applied, the velocity of the object remains unchanged. It explains why we need to apply a force to start or stop motion.",

    "what is the unit of force?": "In the International System of Units (SI), the unit of force is the Newton (N). One Newton is defined as the amount of force required to accelerate a one-kilogram mass by one meter per second squared. It is derived from Newton's Second Law: Force = mass × acceleration (F = ma).",

    "what is kinetic energy?": "Kinetic energy is the energy that an object possesses due to its motion. It is given by the formula KE = 1/2 × m × v², where 'm' is the mass of the object and 'v' is its velocity. The faster an object moves or the heavier it is, the more kinetic energy it has. Kinetic energy is a scalar quantity and is always positive or zero.",

    "what does e = mc^2 mean?": "Einstein's famous equation E = mc² describes the relationship between mass and energy. It shows that mass can be converted into energy and vice versa. 'E' represents energy, 'm' is mass, and 'c' is the speed of light in a vacuum (approximately 3 × 10⁸ m/s). This equation is the foundation of nuclear energy and explains phenomena like the immense energy released in nuclear reactions.",

    "what is the difference between speed and velocity?": "Speed is a scalar quantity that measures how fast an object is moving, regardless of its direction. Velocity, on the other hand, is a vector quantity — it includes both the speed and the direction of motion. For example, 60 km/h north is a velocity, while 60 km/h alone is just speed.",

    "what is acceleration?": "Acceleration is the rate at which an object's velocity changes over time. It can involve an increase or decrease in speed or a change in direction. It is calculated as the change in velocity divided by the time taken. Acceleration is a vector quantity and is measured in meters per second squared (m/s²).",

    "what is ohm’s law?": "Ohm’s Law describes the relationship between voltage (V), current (I), and resistance (R) in an electrical circuit. It states that the current through a conductor between two points is directly proportional to the voltage and inversely proportional to the resistance. The formula is V = IR. This law is fundamental in understanding how electrical circuits operate.",

    "what is the conservation of energy?": "The law of conservation of energy states that energy cannot be created or destroyed — it can only be transformed from one form to another. For example, potential energy can become kinetic energy, or chemical energy can become thermal energy. The total energy in a closed system remains constant, making this principle fundamental in all areas of physics.",

    "what is a vector quantity?": "A vector quantity is one that has both magnitude and direction. Unlike scalar quantities (which have only magnitude), vectors provide more complete information about physical phenomena. Common examples of vector quantities include force, velocity, acceleration, and displacement.",

    "what is gravitational acceleration on earth?": "Gravitational acceleration on Earth is the acceleration that objects experience due to the Earth's gravitational pull. It is approximately 9.8 meters per second squared (m/s²). This means that in the absence of air resistance, an object will increase its velocity by 9.8 m/s every second it falls."
  };

  const answer = responses[question] || "Sorry, I don't know the answer to that yet."

  return Response.json({ answer })
}
