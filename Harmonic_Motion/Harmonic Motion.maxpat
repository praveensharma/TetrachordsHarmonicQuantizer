{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 0,
      "revision": 0,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      100,
      100,
      670,
      169
    ],
    "devicewidth": 670,
    "openinpresentation": 1,
    "bgcolor": [
      0.12,
      0.14,
      0.16,
      1
    ],
    "boxes": [
      {
        "box": {
          "id": "title",
          "maxclass": "comment",
          "varname": "title",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            7,
            270,
            25
          ],
          "fontname": "Arial",
          "fontsize": 17,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            7,
            270,
            25
          ],
          "text": "Harmonic Motion",
          "fontface": 1
        }
      },
      {
        "box": {
          "id": "subtitle",
          "maxclass": "comment",
          "varname": "subtitle",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            36,
            630,
            20
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            36,
            630,
            20
          ],
          "text": "Stateful Nearest \u00b7 fixed Voice A \u2192 D positions, ordered low \u2192 high"
        }
      },
      {
        "box": {
          "id": "status",
          "maxclass": "comment",
          "varname": "status",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            140,
            640,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            140,
            640,
            22
          ],
          "text": "Waiting",
          "bgcolor": [
            0,
            0,
            0,
            0
          ]
        }
      },
      {
        "box": {
          "id": "engine",
          "maxclass": "newobj",
          "varname": "engine",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "js harmonic_motion.js"
        }
      },
      {
        "box": {
          "id": "midi-in",
          "maxclass": "newobj",
          "varname": "midi-in",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "midiin"
        }
      },
      {
        "box": {
          "id": "midi-out",
          "maxclass": "newobj",
          "varname": "midi-out",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "midiout"
        }
      },
      {
        "box": {
          "id": "ready",
          "maxclass": "newobj",
          "varname": "ready",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "live.thisdevice"
        }
      },
      {
        "box": {
          "id": "defer",
          "maxclass": "newobj",
          "varname": "defer",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "deferlow"
        }
      },
      {
        "box": {
          "id": "init",
          "maxclass": "message",
          "varname": "init",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "init"
        }
      },
      {
        "box": {
          "id": "motion_group",
          "maxclass": "umenu",
          "varname": "motion_group",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            480,
            9,
            170,
            23
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            480,
            9,
            170,
            23
          ],
          "parameter_enable": 1,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Motion Ensemble",
              "parameter_shortname": "Motion Ensemble",
              "parameter_type": 2,
              "parameter_mmin": 0,
              "parameter_mmax": 7,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ],
              "parameter_enum": [
                "Ensemble A",
                "Ensemble B",
                "Ensemble C",
                "Ensemble D",
                "Ensemble E",
                "Ensemble F",
                "Ensemble G",
                "Ensemble H"
              ]
            }
          },
          "items": [
            "Ensemble A",
            ",",
            "Ensemble B",
            ",",
            "Ensemble C",
            ",",
            "Ensemble D",
            ",",
            "Ensemble E",
            ",",
            "Ensemble F",
            ",",
            "Ensemble G",
            ",",
            "Ensemble H"
          ],
          "outlettype": [
            "int",
            "",
            ""
          ]
        }
      },
      {
        "box": {
          "id": "group-offset",
          "maxclass": "newobj",
          "varname": "group-offset",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "+ 1"
        }
      },
      {
        "box": {
          "id": "group-send",
          "maxclass": "newobj",
          "varname": "group-send",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "prepend ensemble"
        }
      },
      {
        "box": {
          "id": "motion_bias_1-label",
          "maxclass": "comment",
          "varname": "motion_bias_1-label",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            64,
            105,
            18
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            64,
            105,
            18
          ],
          "text": "Voice A Motion"
        }
      },
      {
        "box": {
          "id": "motion_bias_1",
          "maxclass": "flonum",
          "varname": "motion_bias_1",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            15,
            85,
            90,
            23
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            85,
            90,
            23
          ],
          "parameter_enable": 1,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "V1 Motion Bias",
              "parameter_shortname": "V1 Motion Bias",
              "parameter_type": 0,
              "parameter_mmin": -100,
              "parameter_mmax": 100,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "minimum": -100,
          "maximum": 100,
          "outlettype": [
            "float",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "motion_bias_1-send",
          "maxclass": "newobj",
          "varname": "motion_bias_1-send",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "prepend bias 1"
        }
      },
      {
        "box": {
          "id": "motion_bias_2-label",
          "maxclass": "comment",
          "varname": "motion_bias_2-label",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            125,
            64,
            105,
            18
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            125,
            64,
            105,
            18
          ],
          "text": "Voice B Motion"
        }
      },
      {
        "box": {
          "id": "motion_bias_2",
          "maxclass": "flonum",
          "varname": "motion_bias_2",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            125,
            85,
            90,
            23
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            125,
            85,
            90,
            23
          ],
          "parameter_enable": 1,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "V2 Motion Bias",
              "parameter_shortname": "V2 Motion Bias",
              "parameter_type": 0,
              "parameter_mmin": -100,
              "parameter_mmax": 100,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "minimum": -100,
          "maximum": 100,
          "outlettype": [
            "float",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "motion_bias_2-send",
          "maxclass": "newobj",
          "varname": "motion_bias_2-send",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "prepend bias 2"
        }
      },
      {
        "box": {
          "id": "motion_bias_3-label",
          "maxclass": "comment",
          "varname": "motion_bias_3-label",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            235,
            64,
            105,
            18
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            235,
            64,
            105,
            18
          ],
          "text": "Voice C Motion"
        }
      },
      {
        "box": {
          "id": "motion_bias_3",
          "maxclass": "flonum",
          "varname": "motion_bias_3",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            235,
            85,
            90,
            23
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            235,
            85,
            90,
            23
          ],
          "parameter_enable": 1,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "V3 Motion Bias",
              "parameter_shortname": "V3 Motion Bias",
              "parameter_type": 0,
              "parameter_mmin": -100,
              "parameter_mmax": 100,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "minimum": -100,
          "maximum": 100,
          "outlettype": [
            "float",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "motion_bias_3-send",
          "maxclass": "newobj",
          "varname": "motion_bias_3-send",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "prepend bias 3"
        }
      },
      {
        "box": {
          "id": "motion_bias_4-label",
          "maxclass": "comment",
          "varname": "motion_bias_4-label",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            345,
            64,
            105,
            18
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            345,
            64,
            105,
            18
          ],
          "text": "Voice D Motion"
        }
      },
      {
        "box": {
          "id": "motion_bias_4",
          "maxclass": "flonum",
          "varname": "motion_bias_4",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            345,
            85,
            90,
            23
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            345,
            85,
            90,
            23
          ],
          "parameter_enable": 1,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "V4 Motion Bias",
              "parameter_shortname": "V4 Motion Bias",
              "parameter_type": 0,
              "parameter_mmin": -100,
              "parameter_mmax": 100,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "minimum": -100,
          "maximum": 100,
          "outlettype": [
            "float",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "motion_bias_4-send",
          "maxclass": "newobj",
          "varname": "motion_bias_4-send",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "prepend bias 4"
        }
      },
      {
        "box": {
          "id": "spread-label",
          "maxclass": "comment",
          "varname": "spread-label",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            480,
            64,
            170,
            18
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            480,
            64,
            170,
            18
          ],
          "text": "Spread Motion"
        }
      },
      {
        "box": {
          "id": "spread_motion",
          "maxclass": "flonum",
          "varname": "spread_motion",
          "numinlets": 1,
          "numoutlets": 2,
          "patching_rect": [
            480,
            85,
            170,
            23
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            480,
            85,
            170,
            23
          ],
          "parameter_enable": 1,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Spread Motion",
              "parameter_shortname": "Spread Motion",
              "parameter_type": 0,
              "parameter_mmin": -100,
              "parameter_mmax": 100,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "minimum": -100,
          "maximum": 100,
          "outlettype": [
            "float",
            "bang"
          ]
        }
      },
      {
        "box": {
          "id": "spread-send",
          "maxclass": "newobj",
          "varname": "spread-send",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            20,
            400,
            160,
            22
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "text": "prepend spreadmotion"
        }
      },
      {
        "box": {
          "id": "legend",
          "maxclass": "comment",
          "varname": "legend",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            113,
            430,
            18
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            113,
            430,
            18
          ],
          "text": "\u2212100 Down     0 Neutral     +100 Up"
        }
      },
      {
        "box": {
          "id": "spread-legend",
          "maxclass": "comment",
          "varname": "spread-legend",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            465,
            113,
            200,
            18
          ],
          "fontname": "Arial",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "presentation": 1,
          "presentation_rect": [
            465,
            113,
            200,
            18
          ],
          "text": "\u2212 Contract    0    + Expand"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "ready",
            0
          ],
          "destination": [
            "defer",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "defer",
            0
          ],
          "destination": [
            "init",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "init",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "engine",
            0
          ],
          "destination": [
            "status",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "midi-in",
            0
          ],
          "destination": [
            "midi-out",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_group",
            0
          ],
          "destination": [
            "group-offset",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "group-offset",
            0
          ],
          "destination": [
            "group-send",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "group-send",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_bias_1",
            0
          ],
          "destination": [
            "motion_bias_1-send",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_bias_1-send",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_bias_2",
            0
          ],
          "destination": [
            "motion_bias_2-send",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_bias_2-send",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_bias_3",
            0
          ],
          "destination": [
            "motion_bias_3-send",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_bias_3-send",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_bias_4",
            0
          ],
          "destination": [
            "motion_bias_4-send",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "motion_bias_4-send",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "spread_motion",
            0
          ],
          "destination": [
            "spread-send",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "spread-send",
            0
          ],
          "destination": [
            "engine",
            0
          ]
        }
      }
    ],
    "parameters": {
      "motion_group": [
        "Motion Ensemble",
        "Motion Ensemble",
        0
      ],
      "motion_bias_1": [
        "V1 Motion Bias",
        "V1 Motion Bias",
        0
      ],
      "motion_bias_2": [
        "V2 Motion Bias",
        "V2 Motion Bias",
        0
      ],
      "motion_bias_3": [
        "V3 Motion Bias",
        "V3 Motion Bias",
        0
      ],
      "motion_bias_4": [
        "V4 Motion Bias",
        "V4 Motion Bias",
        0
      ],
      "spread_motion": [
        "Spread Motion",
        "Spread Motion",
        0
      ]
    },
    "dependency_cache": [
      {
        "name": "harmonic_motion.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ]
  }
}
