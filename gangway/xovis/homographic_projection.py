#!/usr/bin/env python3
"""
Project points from image space to floor space
"""

import cv2
import numpy as np

from .. import config


def get_homography(src=None, dst=None):
    """
    Berechnet die 3x3 Homographie-Matrix.
    src, dst: Jeweils 4 Punkte als (4, 2) array.
    """
    if src is None:
        src = np.array(config.CONFIG.SRC_POINTS)
    if dst is None:
        dst = np.array(config.CONFIG.DST_POINTS)

    return cv2.getPerspectiveTransform(
        np.array(src, dtype=np.float32), np.array(dst, dtype=np.float32)
    )


def apply_transform(points, M=None):
    """
    Wendet die Matrix M auf eine Liste von Punkten an.
    points: (N, 2) array
    """
    if M is None:
        M = get_homography()
    # In homogene Koordinaten umwandeln (x, y) -> (x, y, 1)
    points_homo = np.pad(points, ((0, 0), (0, 1)), constant_values=1)

    # Transformation: P' = M * P
    transformed = points_homo @ M.T

    # Normalisierung (Division durch w-Komponente)
    return transformed[:, :2] / transformed[:, 2, np.newaxis]
