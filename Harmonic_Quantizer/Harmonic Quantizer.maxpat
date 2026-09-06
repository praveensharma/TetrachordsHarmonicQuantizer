{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 0,
      "revision": 10,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      100.0,
      100.0,
      790.0,
      370.0
    ],
    "openinpresentation": 1,
    "gridsize": [
      15.0,
      15.0
    ],
    "devicewidth": 750,
    "description": "MIDI harmonic quantizer with clear scale, chord and mapping modes.",
    "digest": "Tetrachords chord-nearest, scale and intentional mapping processor.",
    "tags": "MIDI Tetrachords harmonic quantizer",
    "boxes": [
      {
        "box": {
          "fontface": 1,
          "fontsize": 16.0,
          "id": "obj-title",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            20.0,
            15.0,
            290.0,
            24.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            7,
            245,
            24
          ],
          "text": "Harmonic Quantizer",
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-subtitle",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            20.0,
            42.0,
            520.0,
            20.0
          ],
          "presentation": 0,
          "presentation_rect": [
            290,
            10,
            440,
            18
          ],
          "text": "PITCH  /  REGISTER  /  ENSEMBLE",
          "fontsize": 10.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ]
        }
      },
      {
        "box": {
          "id": "obj-midiin",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "int"
          ],
          "patching_rect": [
            20.0,
            90.0,
            48.0,
            22.0
          ],
          "text": "midiin"
        }
      },
      {
        "box": {
          "id": "obj-receive",
          "maxclass": "newobj",
          "numinlets": 0,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20.0,
            125.0,
            205.0,
            22.0
          ],
          "text": "r tetrachords_harmony_bus_v1"
        }
      },
      {
        "box": {
          "id": "obj-js",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 3,
          "outlettype": [
            "",
            "",
            ""
          ],
          "patching_rect": [
            270.0,
            105.0,
            200.0,
            22.0
          ],
          "saved_object_attributes": {
            "filename": "harmonic_quantizer.js",
            "parameter_enable": 0
          },
          "text": "js harmonic_quantizer.js"
        }
      },
      {
        "box": {
          "id": "obj-midiout",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            515.0,
            90.0,
            55.0,
            22.0
          ],
          "text": "midiout"
        }
      },
      {
        "box": {
          "id": "obj-status-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            20.0,
            175.0,
            50.0,
            20.0
          ],
          "presentation": 0,
          "presentation_rect": [
            15.0,
            66.0,
            50.0,
            20.0
          ],
          "text": "Status"
        }
      },
      {
        "box": {
          "id": "obj-status",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            85.0,
            173.0,
            625.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            145,
            720,
            19
          ],
          "text": "Waiting for Tetrachords harmony",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.0,
            0.0,
            0.0,
            0.0
          ],
          "ignoreclick": 1,
          "varname": "obj-status",
          "hidden": 1
        }
      },
      {
        "box": {
          "id": "obj-loadbang",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            20.0,
            230.0,
            60.0,
            22.0
          ],
          "text": "loadbang"
        }
      },
      {
        "box": {
          "id": "obj-delay",
          "maxclass": "newobj",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            95.0,
            230.0,
            65.0,
            22.0
          ],
          "text": "delay 100"
        }
      },
      {
        "box": {
          "id": "obj-init",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            175.0,
            230.0,
            40.0,
            22.0
          ],
          "text": "init"
        }
      },
      {
        "box": {
          "id": "obj-channels",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            235.0,
            230.0,
            233.0,
            20.0
          ],
          "presentation": 0,
          "presentation_rect": [
            15.0,
            228.0,
            710,
            20.0
          ],
          "text": "One device per part. MIDI channels are preserved."
        }
      },
      {
        "box": {
          "id": "obj-tie-up",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            425.0,
            230.0,
            85.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            205.0,
            228.0,
            85.0,
            22.0
          ],
          "text": "tiebreakup 1"
        }
      },
      {
        "box": {
          "id": "obj-tie-down",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            525.0,
            230.0,
            85.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            305.0,
            228.0,
            85.0,
            22.0
          ],
          "text": "tiebreakup 0"
        }
      },
      {
        "box": {
          "id": "obj-bypass-on",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            625.0,
            230.0,
            65.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            405.0,
            228.0,
            65.0,
            22.0
          ],
          "text": "bypass 1"
        }
      },
      {
        "box": {
          "id": "obj-bypass-off",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20.0,
            275.0,
            65.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            485.0,
            228.0,
            65.0,
            22.0
          ],
          "text": "bypass 0"
        }
      },
      {
        "box": {
          "id": "obj-panic",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            100.0,
            275.0,
            50.0,
            22.0
          ],
          "presentation": 0,
          "presentation_rect": [
            565.0,
            228.0,
            50.0,
            22.0
          ],
          "text": "panic"
        }
      },
      {
        "box": {
          "id": "obj-reset-voices-button",
          "maxclass": "button",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            20.0,
            465.0,
            20.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            590,
            38,
            17,
            17
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "color": [
            0.44,
            0.85,
            0.73,
            1.0
          ],
          "hint": "Clear local voice memory; held-note releases remain intact.",
          "varname": "obj-reset-voices-button",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-reset-voices-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            50.0,
            465.0,
            90.0,
            20.0
          ],
          "presentation": 1,
          "presentation_rect": [
            615,
            38,
            125,
            18
          ],
          "text": "Reset Voices",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-reset-voices-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-reset-voices-message",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            155.0,
            465.0,
            75.0,
            22.0
          ],
          "text": "resetvoices"
        }
      },
      {
        "box": {
          "id": "obj-thisdevice",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "bang",
            "int",
            "int"
          ],
          "patching_rect": [
            170.0,
            275.0,
            95.0,
            22.0
          ],
          "text": "live.thisdevice"
        }
      },
      {
        "box": {
          "id": "obj-help",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            290.0,
            275.0,
            380.0,
            20.0
          ],
          "presentation": 0,
          "presentation_rect": [
            15.0,
            252,
            710,
            36
          ],
          "text": "Ensemble: assigned pitches persist after Note Off. 4 ms collection; P1–P4 priority. Reset clears pitch memory.",
          "linecount": 2
        }
      },
      {
        "box": {
          "id": "obj-mode-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            15,
            38,
            40,
            18
          ],
          "text": "Mode",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-mode-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-mode-chromatic",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            65.0,
            100.0,
            90.0,
            22.0
          ],
          "text": "chromatic"
        }
      },
      {
        "box": {
          "id": "obj-mode-nearest",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            165.0,
            100.0,
            70.0,
            22.0
          ],
          "text": "nearest"
        }
      },
      {
        "box": {
          "id": "obj-mode-up",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            245.0,
            100.0,
            35.0,
            22.0
          ],
          "text": "up"
        }
      },
      {
        "box": {
          "id": "obj-mode-down",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "presentation": 0,
          "presentation_rect": [
            290.0,
            100.0,
            45.0,
            22.0
          ],
          "text": "down"
        }
      },
      {
        "box": {
          "id": "obj-mode-menu",
          "items": [
            "chord-nearest",
            ",",
            "scale-nearest",
            ",",
            "chord-map",
            ",",
            "scale-contour",
            ",",
            "stateful-nearest",
            ",",
            "scale-up",
            ",",
            "scale-down",
            ",",
            "scale-map"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            20.0,
            320.0,
            140.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            60,
            35,
            165,
            23
          ],
          "parameter_enable": 1,
          "varname": "quantizer_mode",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Quantizer Mode",
              "parameter_shortname": "Mode",
              "parameter_type": 2,
              "parameter_mmax": 7,
              "parameter_enum": [
                "chord-nearest",
                "scale-nearest",
                "chord-map",
                "scale-contour",
                "stateful-nearest",
                "scale-up",
                "scale-down",
                "scale-map"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                2
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-mode-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            175.0,
            320.0,
            90.0,
            22.0
          ],
          "text": "prepend mode"
        }
      },
      {
        "box": {
          "id": "obj-harmonizer-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            15,
            67,
            68,
            18
          ],
          "text": "Chord Map",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-harmonizer-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-harmonizer-menu",
          "items": [
            "pitchclass",
            ",",
            "voicing"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            20.0,
            425.0,
            120.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            85,
            64,
            130,
            23
          ],
          "parameter_enable": 1,
          "varname": "chord_map",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Chord Map",
              "parameter_shortname": "Chord Map",
              "parameter_type": 2,
              "parameter_mmax": 1,
              "parameter_enum": [
                "pitchclass",
                "voicing"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-harmonizer-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            155.0,
            425.0,
            135.0,
            22.0
          ],
          "text": "prepend harmonizermap"
        }
      },
      {
        "box": {
          "id": "obj-timing-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            245,
            38,
            45,
            18
          ],
          "text": "Change",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-timing-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-timing-menu",
          "items": [
            "immediate",
            ",",
            "nextnote",
            ",",
            "nextbar"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            285.0,
            320.0,
            120.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            295,
            35,
            110,
            23
          ],
          "parameter_enable": 1,
          "varname": "harmony_change",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Harmony Change",
              "parameter_shortname": "Change",
              "parameter_type": 2,
              "parameter_mmax": 2,
              "parameter_enum": [
                "immediate",
                "nextnote",
                "nextbar"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                1
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-timing-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            420.0,
            320.0,
            95.0,
            22.0
          ],
          "text": "prepend timing"
        }
      },
      {
        "box": {
          "id": "obj-gravity-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            425,
            38,
            48,
            18
          ],
          "text": "Gravity",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-gravity-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-gravity-menu",
          "items": [
            "off",
            ",",
            "light",
            ",",
            "strong"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            530.0,
            320.0,
            90.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            478,
            35,
            90,
            23
          ],
          "parameter_enable": 1,
          "varname": "root_gravity",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Root Gravity",
              "parameter_shortname": "Gravity",
              "parameter_type": 2,
              "parameter_mmax": 2,
              "parameter_enum": [
                "off",
                "light",
                "strong"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-gravity-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            635.0,
            320.0,
            100.0,
            22.0
          ],
          "text": "prepend gravity"
        }
      },
      {
        "box": {
          "id": "obj-continuity-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            235,
            67,
            72,
            18
          ],
          "text": "Continuity",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-continuity-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-continuity-number",
          "maxclass": "number",
          "maximum": 100,
          "minimum": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            20.0,
            355.0,
            55.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            310,
            64,
            50,
            23
          ],
          "parameter_enable": 1,
          "varname": "continuity",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Continuity",
              "parameter_shortname": "Continuity",
              "parameter_type": 3,
              "parameter_mmin": 0,
              "parameter_mmax": 100,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                60
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hint": "Stateful Nearest: 0% is nearest-note quantization; higher values favor continuity.",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-continuity-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            90.0,
            355.0,
            110.0,
            22.0
          ],
          "text": "prepend continuity"
        }
      },
      {
        "box": {
          "id": "obj-register-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            385,
            67,
            55,
            18
          ],
          "text": "Register",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-register-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-register-mode-menu",
          "items": [
            "limited",
            ",",
            "free"
          ],
          "maxclass": "umenu",
          "numinlets": 1,
          "numoutlets": 3,
          "outlettype": [
            "int",
            "",
            ""
          ],
          "patching_rect": [
            535.0,
            390.0,
            80.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            445,
            64,
            80,
            23
          ],
          "parameter_enable": 1,
          "varname": "register_mode",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Register Mode",
              "parameter_shortname": "Register",
              "parameter_type": 2,
              "parameter_mmax": 1,
              "parameter_enum": [
                "limited",
                "free"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hint": "Free bypasses register boundaries. Limited uses the existing mode-specific Low/High behavior.",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-register-mode-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            630.0,
            390.0,
            135.0,
            22.0
          ],
          "text": "prepend registermode"
        }
      },
      {
        "box": {
          "id": "obj-low-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            535,
            67,
            30,
            18
          ],
          "text": "Low",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-low-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-low-number",
          "maxclass": "number",
          "maximum": 127,
          "minimum": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            220.0,
            355.0,
            50.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            570,
            64,
            48,
            23
          ],
          "parameter_enable": 1,
          "varname": "register_low",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Register Low",
              "parameter_shortname": "Low",
              "parameter_type": 3,
              "parameter_mmin": 0,
              "parameter_mmax": 127,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                24
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-low-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            285.0,
            355.0,
            75.0,
            22.0
          ],
          "text": "prepend low"
        }
      },
      {
        "box": {
          "id": "obj-high-label",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "presentation": 1,
          "presentation_rect": [
            630,
            67,
            34,
            18
          ],
          "text": "High",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-high-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-high-number",
          "maxclass": "number",
          "maximum": 127,
          "minimum": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            375.0,
            355.0,
            50.0,
            22.0
          ],
          "presentation": 1,
          "presentation_rect": [
            670,
            64,
            48,
            23
          ],
          "parameter_enable": 1,
          "varname": "register_high",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Register High",
              "parameter_shortname": "High",
              "parameter_type": 3,
              "parameter_mmin": 0,
              "parameter_mmax": 127,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                48
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-high-prepend",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            440.0,
            355.0,
            80.0,
            22.0
          ],
          "text": "prepend high"
        }
      },
      {
        "box": {
          "id": "obj-init-controls",
          "maxclass": "message",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            535.0,
            355.0,
            180.0,
            22.0
          ],
          "text": "24, 24, 48"
        }
      },
      {
        "box": {
          "id": "obj-ensemble-label",
          "maxclass": "comment",
          "text": "Ensemble",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            165,
            65,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            96,
            65,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-ensemble-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-ensemble-number",
          "maxclass": "number",
          "maximum": 8,
          "minimum": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            85,
            163,
            45,
            22
          ],
          "presentation": 1,
          "presentation_rect": [
            85,
            93,
            50,
            23
          ],
          "parameter_enable": 1,
          "varname": "ensemble_group",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Ensemble Group",
              "parameter_shortname": "Ensemble Group",
              "parameter_type": 3,
              "parameter_mmin": 0,
              "parameter_mmax": 8,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hint": "0 = Off. Use the same group on coordinated parts. Enabled groups add a 4 ms collection window.",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-ensemble-number-prepend",
          "maxclass": "newobj",
          "text": "prepend ensemble",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20,
            773,
            140,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-ensemble-off-label",
          "maxclass": "comment",
          "text": "0 = Off",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            135,
            165,
            55,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            140,
            96,
            55,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-ensemble-off-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-part-label",
          "maxclass": "comment",
          "text": "Part",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            205,
            165,
            35,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            205,
            96,
            35,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-part-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-part-number",
          "maxclass": "number",
          "maximum": 4,
          "minimum": 1,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            245,
            163,
            45,
            22
          ],
          "presentation": 1,
          "presentation_rect": [
            245,
            93,
            45,
            23
          ],
          "parameter_enable": 1,
          "varname": "ensemble_part",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Ensemble Part",
              "parameter_shortname": "Ensemble Part",
              "parameter_type": 3,
              "parameter_mmin": 1,
              "parameter_mmax": 4,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                1
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hint": "Choose a unique Part 1–4 within the ensemble.",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-part-number-prepend",
          "maxclass": "newobj",
          "text": "prepend part",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20,
            777,
            140,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-separation-label",
          "maxclass": "comment",
          "text": "Separation %",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            310,
            165,
            95,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            315,
            96,
            95,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-separation-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-separation-number",
          "maxclass": "number",
          "maximum": 100,
          "minimum": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "",
            "bang"
          ],
          "patching_rect": [
            405,
            163,
            55,
            22
          ],
          "presentation": 1,
          "presentation_rect": [
            410,
            93,
            50,
            23
          ],
          "parameter_enable": 1,
          "varname": "ensemble_separation",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Ensemble Separation",
              "parameter_shortname": "Ensemble Separation",
              "parameter_type": 3,
              "parameter_mmin": 0,
              "parameter_mmax": 100,
              "parameter_initial_enable": 1,
              "parameter_initial": [
                0
              ]
            }
          },
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "hint": "Soft preference against exact unisons. 0% preserves the independent quantizer result.",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-separation-number-prepend",
          "maxclass": "newobj",
          "text": "prepend separation",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            20,
            780,
            140,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-reset-ensemble-button",
          "maxclass": "button",
          "numinlets": 1,
          "numoutlets": 1,
          "outlettype": [
            "bang"
          ],
          "patching_rect": [
            505,
            164,
            20,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            505,
            96,
            17,
            17
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1.0
          ],
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1.0
          ],
          "color": [
            0.44,
            0.85,
            0.73,
            1.0
          ],
          "hint": "Clear pitch memory for every part in this ensemble.",
          "varname": "obj-reset-ensemble-button",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-reset-ensemble-label",
          "maxclass": "comment",
          "text": "Reset Ensemble",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            530,
            165,
            130,
            20
          ],
          "presentation": 1,
          "presentation_rect": [
            535,
            96,
            135,
            18
          ],
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.66,
            0.72,
            0.76,
            1.0
          ],
          "varname": "obj-reset-ensemble-label",
          "hidden": 0
        }
      },
      {
        "box": {
          "id": "obj-reset-ensemble-message",
          "maxclass": "message",
          "text": "resetensemble",
          "numinlets": 2,
          "numoutlets": 1,
          "outlettype": [
            ""
          ],
          "patching_rect": [
            500,
            700,
            100,
            22
          ]
        }
      },
      {
        "box": {
          "id": "obj-ensemble-monitor",
          "maxclass": "comment",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            196,
            710,
            22
          ],
          "presentation": 1,
          "presentation_rect": [
            15,
            122,
            720,
            19
          ],
          "text": "Ensemble Off — independent quantization",
          "fontsize": 11.0,
          "fontname": "Arial",
          "textcolor": [
            0.44,
            0.85,
            0.73,
            1.0
          ],
          "bgcolor": [
            0.0,
            0.0,
            0.0,
            0.0
          ],
          "ignoreclick": 1,
          "varname": "obj-ensemble-monitor",
          "hidden": 1
        }
      },
      {
        "box": {
          "id": "monitor-play-tab",
          "maxclass": "textbutton",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            570,
            7,
            80,
            23
          ],
          "varname": "monitor-play-tab",
          "presentation": 1,
          "presentation_rect": [
            570,
            7,
            80,
            23
          ],
          "text": "Play",
          "texton": "Play",
          "mode": 0,
          "outlettype": [
            "",
            "int",
            ""
          ],
          "rounded": 7,
          "bgcolor": [
            0.04,
            0.48,
            1,
            1
          ],
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "fontsize": 11
        }
      },
      {
        "box": {
          "id": "monitor-play-bang",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            1800,
            180,
            22
          ],
          "varname": "monitor-play-bang",
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "monitor-play-message",
          "maxclass": "message",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            1800,
            180,
            22
          ],
          "varname": "monitor-play-message",
          "text": "page 0"
        }
      },
      {
        "box": {
          "id": "monitor-monitor-tab",
          "maxclass": "textbutton",
          "numinlets": 1,
          "numoutlets": 3,
          "patching_rect": [
            655,
            7,
            80,
            23
          ],
          "varname": "monitor-monitor-tab",
          "presentation": 1,
          "presentation_rect": [
            655,
            7,
            80,
            23
          ],
          "text": "Monitor",
          "texton": "Monitor",
          "mode": 0,
          "outlettype": [
            "",
            "int",
            ""
          ],
          "rounded": 7,
          "bgcolor": [
            0.22,
            0.25,
            0.28,
            1
          ],
          "textcolor": [
            0.91,
            0.93,
            0.94,
            1
          ],
          "fontsize": 11
        }
      },
      {
        "box": {
          "id": "monitor-monitor-bang",
          "maxclass": "newobj",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            1800,
            180,
            22
          ],
          "varname": "monitor-monitor-bang",
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "monitor-monitor-message",
          "maxclass": "message",
          "numinlets": 1,
          "numoutlets": 1,
          "patching_rect": [
            10,
            1800,
            180,
            22
          ],
          "varname": "monitor-monitor-message",
          "text": "page 1"
        }
      },
      {
        "box": {
          "id": "monitor-compact",
          "maxclass": "jsui",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            121,
            720,
            43
          ],
          "varname": "monitor-compact",
          "presentation": 1,
          "presentation_rect": [
            15,
            121,
            720,
            43
          ],
          "jsarguments": [
            "compact",
            "{\"play\": [\"obj-reset-voices-button\", \"obj-reset-voices-label\", \"obj-mode-label\", \"quantizer_mode\", \"obj-harmonizer-label\", \"chord_map\", \"obj-timing-label\", \"harmony_change\", \"obj-gravity-label\", \"root_gravity\", \"obj-continuity-label\", \"continuity\", \"obj-register-label\", \"register_mode\", \"obj-low-label\", \"register_low\", \"obj-high-label\", \"register_high\", \"obj-ensemble-label\", \"ensemble_group\", \"obj-ensemble-off-label\", \"obj-part-label\", \"ensemble_part\", \"obj-separation-label\", \"ensemble_separation\", \"obj-reset-ensemble-button\", \"obj-reset-ensemble-label\", \"monitor-compact\"], \"monitor\": [\"obj-status\", \"obj-ensemble-monitor\", \"monitor-detail\"]}"
          ],
          "filename": "harmonic_monitor.js",
          "parameter_enable": 0,
          "border": 0,
          "bgcolor": [
            0,
            0,
            0,
            0
          ],
          "ignoreclick": 1
        }
      },
      {
        "box": {
          "id": "monitor-detail",
          "maxclass": "jsui",
          "numinlets": 1,
          "numoutlets": 0,
          "patching_rect": [
            15,
            35,
            720,
            85
          ],
          "varname": "monitor-detail",
          "presentation": 1,
          "presentation_rect": [
            15,
            35,
            720,
            85
          ],
          "jsarguments": [
            "detail",
            "{\"play\": [\"obj-reset-voices-button\", \"obj-reset-voices-label\", \"obj-mode-label\", \"quantizer_mode\", \"obj-harmonizer-label\", \"chord_map\", \"obj-timing-label\", \"harmony_change\", \"obj-gravity-label\", \"root_gravity\", \"obj-continuity-label\", \"continuity\", \"obj-register-label\", \"register_mode\", \"obj-low-label\", \"register_low\", \"obj-high-label\", \"register_high\", \"obj-ensemble-label\", \"ensemble_group\", \"obj-ensemble-off-label\", \"obj-part-label\", \"ensemble_part\", \"obj-separation-label\", \"ensemble_separation\", \"obj-reset-ensemble-button\", \"obj-reset-ensemble-label\", \"monitor-compact\"], \"monitor\": [\"obj-status\", \"obj-ensemble-monitor\", \"monitor-detail\"]}"
          ],
          "hidden": 1,
          "filename": "harmonic_monitor.js",
          "parameter_enable": 0,
          "border": 0,
          "bgcolor": [
            0,
            0,
            0,
            0
          ],
          "ignoreclick": 1
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-bypass-off",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-reset-voices-message",
            0
          ],
          "source": [
            "obj-reset-voices-button",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-reset-voices-message",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-bypass-on",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-init",
            0
          ],
          "source": [
            "obj-delay",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-init",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-midiout",
            0
          ],
          "source": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-status",
            0
          ],
          "source": [
            "obj-js",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-delay",
            0
          ],
          "source": [
            "obj-loadbang",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-midiin",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-panic",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            1
          ],
          "source": [
            "obj-receive",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-tie-down",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-tie-up",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-chromatic",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-nearest",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-up",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-down",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-mode-prepend",
            0
          ],
          "source": [
            "obj-mode-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-mode-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-timing-prepend",
            0
          ],
          "source": [
            "obj-timing-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-timing-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-gravity-prepend",
            0
          ],
          "source": [
            "obj-gravity-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-gravity-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-continuity-prepend",
            0
          ],
          "source": [
            "obj-continuity-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-continuity-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-low-prepend",
            0
          ],
          "source": [
            "obj-low-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-low-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-high-prepend",
            0
          ],
          "source": [
            "obj-high-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-harmonizer-prepend",
            0
          ],
          "source": [
            "obj-harmonizer-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-harmonizer-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-high-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-mode-menu",
            0
          ],
          "source": [
            "obj-thisdevice",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-harmonizer-menu",
            0
          ],
          "source": [
            "obj-thisdevice",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-timing-menu",
            0
          ],
          "source": [
            "obj-thisdevice",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-gravity-menu",
            0
          ],
          "source": [
            "obj-thisdevice",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-continuity-number",
            0
          ],
          "source": [
            "obj-thisdevice",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-low-number",
            0
          ],
          "source": [
            "obj-thisdevice",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-high-number",
            0
          ],
          "source": [
            "obj-thisdevice",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-register-mode-prepend",
            0
          ],
          "source": [
            "obj-register-mode-menu",
            1
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-js",
            0
          ],
          "source": [
            "obj-register-mode-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "destination": [
            "obj-register-mode-menu",
            0
          ],
          "source": [
            "obj-thisdevice",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-ensemble-number",
            0
          ],
          "destination": [
            "obj-ensemble-number-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-ensemble-number-prepend",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-thisdevice",
            0
          ],
          "destination": [
            "obj-ensemble-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-part-number",
            0
          ],
          "destination": [
            "obj-part-number-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-part-number-prepend",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-thisdevice",
            0
          ],
          "destination": [
            "obj-part-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-separation-number",
            0
          ],
          "destination": [
            "obj-separation-number-prepend",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-separation-number-prepend",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-thisdevice",
            0
          ],
          "destination": [
            "obj-separation-number",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-reset-ensemble-button",
            0
          ],
          "destination": [
            "obj-reset-ensemble-message",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-reset-ensemble-message",
            0
          ],
          "destination": [
            "obj-js",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "obj-js",
            2
          ],
          "destination": [
            "obj-ensemble-monitor",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-play-tab",
            0
          ],
          "destination": [
            "monitor-play-bang",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-play-bang",
            0
          ],
          "destination": [
            "monitor-play-message",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-play-message",
            0
          ],
          "destination": [
            "monitor-compact",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-monitor-tab",
            0
          ],
          "destination": [
            "monitor-monitor-bang",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-monitor-bang",
            0
          ],
          "destination": [
            "monitor-monitor-message",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "monitor-monitor-message",
            0
          ],
          "destination": [
            "monitor-compact",
            0
          ]
        }
      }
    ],
    "dependency_cache": [
      {
        "name": "harmonic_quantizer.js",
        "bootpath": ".",
        "patcherrelativepath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "harmonic_monitor.js",
        "bootpath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ],
    "autosave": 0,
    "oscreceiveudpport": 0,
    "bgcolor": [
      0.12,
      0.14,
      0.16,
      1.0
    ]
  }
}
