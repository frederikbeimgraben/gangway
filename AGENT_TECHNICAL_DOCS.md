# Information about wiring etc.

We are using a Raspberry Pi 4B, three 24V 300W Power Supplies, a Step-Down Converter to 5V to power the RPi, and WS2805 LED strips.

We wrote a modified version of the rp-ws281x library to support the WS2805 LED strips. (@rpy-ws2805)
(Adjust the License attribution to comply and make it clear that i changed the code)

The strips are wired in a daisy chain going from GPIO 18 into a level shifter, then to the LED strips.
Document how the strips are arranged based on @config.yml.

The strips are powered in 3 groups of 3, each 2m long suspended from the ceiling on aluminum profiles.
