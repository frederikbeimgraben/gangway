"""
Animations module
"""


def to_dict(animation):
    """
    Serializes an animation to a dictionary.
    """
    if not hasattr(animation, "__name__"):
        return {
            "name": "alternate",
            "params": {
                "animations": [to_dict(anim) for anim in animation],
            },
        }

    return {
        "name": animation.__name__,
        "params": animation.__kwdefaults__
        if hasattr(animation, "__kwdefaults__")
        else {},
    }
